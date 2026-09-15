import type { ChapterContext, Manga, ScrollAnchor } from "@/types";
import {
    CurrentProgress,
    CurrentSettings,
    ViewerState,
    getChapterPageCount,
    getCurrentManga,
    refreshMangaFromDisk,
} from "@/state";
import { clamp, createGenerationGuard } from "@/core/utils";
import { destroyActiveVirtualizer, getActiveScrollAnchor, mountVirtualizer, scrollToActiveIndex } from "./virtualizer";
import { isLightboxOpen, navigateLightbox, openLightbox } from "./lightbox";
import { requireElement } from "@/core/dom-utils";
import { resumeAutoScrollIfEnabled } from "./auto-scroll";

const imageContainer = requireElement("#image-container");
const chapterLoadGuard = createGenerationGuard();

function getLocalIndex(target: EventTarget | null): number | null {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
    if (!el?.dataset.index) return null;
    const n = Number(el.dataset.index);
    return Number.isNaN(n) ? null : n;
}

type ImageClickZone = "bottom" | "middle" | "top";

function getImageClickZone(clientY: number): ImageClickZone {
    const third = innerHeight / 3;
    if (clientY < third) return "top";
    if (clientY > third * 2) return "bottom";
    return "middle";
}

imageContainer.addEventListener("click", (event: MouseEvent) => {
    if (getLocalIndex(event.target) === null) return;
    handleImageClick(event);
});
imageContainer.addEventListener("dblclick", (event: MouseEvent) => {
    if (getImageClickZone(event.clientY) !== "middle") return;
    const idx = getLocalIndex(event.target);
    if (idx === null) return;
    openLightbox(idx);
});

export function invalidateChapterLoad(clearImages = false): void {
    ViewerState.update("activeChapter", null);
    ViewerState.update("imageRange", { end: 0, start: 0, total: 0 });
    destroyActiveVirtualizer();

    if (clearImages) {
        imageContainer.replaceChildren();
    }
}

export function forceLoadChapter(chapterIndex: number, restore?: ScrollAnchor): void {
    const manga = getCurrentManga();
    if (!manga) return;
    void loadChapterImagesForManga(manga, chapterIndex, restore);
}

async function loadChapterImagesForManga(manga: Manga, chapterIndex: number, restore?: ScrollAnchor): Promise<void> {
    if (chapterIndex !== 0 && (chapterIndex < 0 || chapterIndex >= manga.totalChapters)) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        forceLoadChapter(0);
        return;
    }

    const myGeneration = chapterLoadGuard.next();
    const scannedPageCount = await getChapterPageCount(manga.id, chapterIndex);
    if (!chapterLoadGuard.isCurrent(myGeneration)) return;
    if (getCurrentManga()?.id !== manga.id) return;
    if (scannedPageCount === null) {
        console.warn(`Failed to read chapter ${chapterIndex} for manga ${manga.id}`);
    }
    const pageCount = scannedPageCount ?? 0;

    invalidateChapterLoad();

    imageContainer.replaceChildren();

    CurrentProgress.update("currentChapter", chapterIndex);
    if (!restore) {
        CurrentProgress.update("scrollAnchor", { index: 0, pageFraction: 0 });
    }

    if (pageCount <= 0) {
        ViewerState.update("imageRange", { end: 0, start: 0, total: 0 });
        return;
    }

    const initialIndex = clamp(restore?.index ?? 0, 0, pageCount - 1);
    const initialFraction = restore?.index === initialIndex ? clamp(restore.pageFraction, 0, 1) : 0;

    const chapterContext: ChapterContext = {
        chapterIndex,
        mangaId: manga.id,
        pageCount,
    };

    const virtualizer = mountVirtualizer({
        container: imageContainer,
        context: chapterContext,
        initialFraction,
        initialIndex,
        onIndexChange: (localIndex) => {
            ViewerState.update("visibleImageIndex", localIndex);
        },
        onRangeChange: (start, end) => {
            ViewerState.update("imageRange", { end, start: start + 1, total: pageCount });
        },
    });

    ViewerState.update("activeChapter", chapterContext);

    void virtualizer.ready.then(resumeAutoScrollIfEnabled);
}

export function navigateImage(direction: number): void {
    if (isLightboxOpen()) {
        navigateLightbox(direction);
        return;
    }

    const anchor = getActiveScrollAnchor();
    if (!anchor) return;
    scrollToActiveIndex(anchor.index + direction, 0, "smooth");
}

// --- Chapter Navigation ---

export function goToChapter(chapterIndex: number): void {
    const manga = getCurrentManga();
    if (!manga || chapterIndex < 0 || chapterIndex >= manga.totalChapters) return;
    if (chapterIndex !== CurrentProgress.currentChapter) {
        forceLoadChapter(chapterIndex);
    }
}

export function loadNextChapter(): void {
    goToChapter(CurrentProgress.currentChapter + 1);
}
export function loadPreviousChapter(): void {
    goToChapter(CurrentProgress.currentChapter - 1);
}

export function goToFirstChapter(): void {
    goToChapter(0);
}

export function goToLastChapter(): void {
    const manga = getCurrentManga();
    if (manga) goToChapter(manga.totalChapters - 1);
}

export async function reloadManga(): Promise<void> {
    const manga = getCurrentManga();
    if (!manga) return;
    const count = await refreshMangaFromDisk(manga.id);
    if (count === null) return;
    forceLoadChapter(CurrentProgress.currentChapter, getActiveScrollAnchor() ?? undefined);
}

function handleImageClick(event: MouseEvent): void {
    const zone = getImageClickZone(event.clientY);
    if (zone === "middle") return;

    const direction = zone === "top" ? -1 : 1;
    scrollTo({
        behavior: "smooth",
        top: Math.max(0, scrollY + direction * CurrentSettings.scrollAmount),
    });
}
