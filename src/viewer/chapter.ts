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
} from "@/state";
import { DOM, addClass } from "@/core/dom-utils";
import type { Manga, ScrollAnchor } from "@/types";
import { isLightboxOpen, navigateLightbox, openLightbox, setLightboxContext } from "./lightbox";
import { loadImage, persistResolvedImagePattern, primeImagePattern } from "@/viewer/image-loader";
import { mountScrubber, teardownScrubber } from "./scrubber";
import Config from "@/core/config";
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

export function loadChapterImages(chapterIndex: number, restore?: ScrollAnchor): void {
    const manga = getCurrentManga();
    if (!manga) return;
    loadChapterImagesForManga(manga, chapterIndex, restore);
}

function loadChapterImagesForManga(manga: Manga, chapterIndex: number, restore?: ScrollAnchor): void {
    const totalChapters = getTotalChapters(manga);
    if (chapterIndex < 0 || chapterIndex >= totalChapters) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        loadChapterImages(0);
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
        CurrentProgress.update("scrollAnchor", { index: 0, offset: 0 });
    }
    primeImagePattern(manga);

    if (pageCount <= 0) {
        ViewerState.update("imageRange", { end: 0, start: 0, total: 0 });
        return;
    }

    const initialIndex = clamp(restore?.index ?? 0, 0, pageCount - 1);
    const initialOffset = restore?.index === initialIndex ? Math.max(0, restore.offset) : 0;

    const chapterContext: ChapterContext = {
        chapterStartIndex: start,
        imagesBasePath: manga.imagesFullPath,
        pageCount,
    };

    let patternSaved = false;

    const virtualizer = mountVirtualizer({
        container: imageContainer,
        context: chapterContext,
        initialIndex,
        initialOffset,
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
        onNearEnd: () => preloadNextChapter(manga, chapterIndex),
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

function changeChapter(direction: number): void {
    const manga = getCurrentManga();
    if (!manga) return;
    const newChapter = CurrentProgress.currentChapter + direction;
    if (newChapter >= 0 && newChapter < getTotalChapters(manga)) {
        loadChapterImages(newChapter);
    }
}

export function loadNextChapter(): void {
    changeChapter(1);
}
export function loadPreviousChapter(): void {
    changeChapter(-1);
}

export function goToFirstChapter(): void {
    if (CurrentProgress.currentChapter !== 0) {
        loadChapterImages(0);
    }
}

export function goToLastChapter(): void {
    const manga = getCurrentManga();
    if (!manga) return;

    const lastChapterIndex = getTotalChapters(manga) - 1;
    if (CurrentProgress.currentChapter !== lastChapterIndex) {
        loadChapterImages(lastChapterIndex);
    }
}

export function reloadCurrentChapter(): void {
    if (!getCurrentManga()) return;
    loadChapterImages(CurrentProgress.currentChapter, getActiveScrollAnchor() ?? undefined);
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

// --- Preloading ---

function preloadNextChapter(manga: Manga, loadedChapterIndex: number): void {
    const nextChapterIndex = loadedChapterIndex + 1;
    if (nextChapterIndex >= getTotalChapters(manga)) return;

    const { start, end } = getChapterBounds(manga, nextChapterIndex);
    const count = Math.min(Config.NEXT_CHAPTER_PRELOAD_COUNT, end - start);
    for (let i = 0; i < count; i++) {
        void loadImage(manga.imagesFullPath, start + i + 1);
    }
}
