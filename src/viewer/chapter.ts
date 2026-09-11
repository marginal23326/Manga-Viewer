import {
    type ChapterContext,
    destroyActiveVirtualizer,
    getActiveScrollAnchor,
    mountVirtualizer,
    scrollToActiveIndex,
} from "./virtualizer";
import {
    CurrentProgress,
    CurrentSettings,
    ViewerState,
    getChapterBounds,
    getCurrentManga,
    getTotalChapters,
    persistResolvedImagePattern,
    primeImagePattern,
} from "@/state";
import { DOM, addClass } from "@/core/dom-utils";
import type { Manga, ScrollAnchor } from "@/types";
import { isLightboxOpen, navigateLightbox, openLightbox, setLightboxContext } from "./lightbox";
import { mountScrubber, teardownScrubber } from "./scrubber";
import { clamp } from "@/core/utils";
import { resumeAutoScrollIfEnabled } from "./auto-scroll";
import { updatePageData } from "./progress-bar";

let imageDelegationAttached = false;

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

function ensureImageDelegation(container: HTMLElement): void {
    if (imageDelegationAttached) return;
    imageDelegationAttached = true;
    container.addEventListener("click", (event: MouseEvent) => {
        if (getLocalIndex(event.target) === null) return;
        handleImageClick(event);
    });
    container.addEventListener("dblclick", (event: MouseEvent) => {
        if (getImageClickZone(event.clientY) !== "middle") return;
        const idx = getLocalIndex(event.target);
        if (idx === null) return;
        openLightbox(idx);
    });
}

export function invalidateChapterLoad(clearImages = false): void {
    setLightboxContext(null);
    destroyActiveVirtualizer();
    teardownScrubber();

    if (clearImages && DOM.imageContainer) {
        DOM.imageContainer.replaceChildren();
    }
}

export function forceLoadChapter(chapterIndex: number, restore?: ScrollAnchor): void {
    const manga = getCurrentManga();
    if (!manga) return;
    loadChapterImagesForManga(manga, chapterIndex, restore);
}

function loadChapterImagesForManga(manga: Manga, chapterIndex: number, restore?: ScrollAnchor): void {
    const totalChapters = getTotalChapters(manga);
    if (chapterIndex < 0 || chapterIndex >= totalChapters) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        forceLoadChapter(0);
        return;
    }

    invalidateChapterLoad();

    const { imageContainer } = DOM;
    if (!imageContainer) {
        console.error("Image container not found!");
        return;
    }

    ensureImageDelegation(imageContainer);
    imageContainer.replaceChildren();

    const { start, end } = getChapterBounds(manga, chapterIndex);
    const pageCount = end - start;
    CurrentProgress.update("currentChapter", chapterIndex);
    if (!restore) {
        CurrentProgress.update("scrollAnchor", { index: 0, pageFraction: 0 });
    }
    primeImagePattern(manga);

    if (pageCount <= 0) {
        ViewerState.update("imageRange", { end: 0, start: 0, total: 0 });
        return;
    }

    const initialIndex = clamp(restore?.index ?? 0, 0, pageCount - 1);
    const initialFraction = restore?.index === initialIndex ? clamp(restore.pageFraction, 0, 1) : 0;

    const chapterContext: ChapterContext = {
        chapterStartIndex: start,
        imagesBasePath: manga.imagesFullPath,
        pageCount,
    };

    let patternSaved = false;

    const virtualizer = mountVirtualizer({
        container: imageContainer,
        context: chapterContext,
        initialFraction,
        initialIndex,
        onIndexChange: (localIndex) => {
            ViewerState.update("visibleImageIndex", localIndex);
        },
        onMount: (img) => {
            addClass(img, "manga-image block max-w-full h-auto mx-auto cursor-pointer");
            if (!patternSaved) {
                patternSaved = true;
                persistResolvedImagePattern(manga);
            }
        },
        onRangeChange: (globalStart, globalEnd) => {
            ViewerState.update("imageRange", { end: globalEnd, start: globalStart + 1, total: manga.totalImages });
        },
    });

    setLightboxContext({ ...chapterContext, onNavigate: (localIndex) => scrollToActiveIndex(localIndex, 0, "smooth") });
    mountScrubber(chapterContext, initialIndex);
    updatePageData(chapterContext, initialIndex);

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
    if (!manga || chapterIndex < 0 || chapterIndex >= getTotalChapters(manga)) return;
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
    if (manga) goToChapter(getTotalChapters(manga) - 1);
}

export function reloadCurrentChapter(): void {
    if (!getCurrentManga()) return;
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
