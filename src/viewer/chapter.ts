import {
    CurrentProgress,
    CurrentSettings,
    PersistState,
    getChapterBounds,
    getCurrentManga,
    getTotalChapters,
} from "@/state";
import { DOM, addClass, animateScrollTo } from "@/core/dom-utils";
import { destroyActiveVirtualizer, getActiveScrollAnchor, mountVirtualizer, scrollToActiveIndex } from "./virtualizer";
import {
    handleImageMouseDown,
    isLightboxLongPress,
    isLightboxOpen,
    navigateLightbox,
    resetLongPressFlag,
    setLightboxContext,
} from "./lightbox";
import { initScrubber, teardownScrubber } from "./scrubber";
import { loadImage, persistResolvedImagePattern, primeImagePattern } from "@/viewer/image-loader";
import Config from "@/core/config";
import type { Manga } from "@/types";
import { clamp } from "@/core/utils";
import { debouncedSaveScroll } from "@/viewer/scroll-position";
import { emitAppEvent } from "@/core/app-events";
import { resumeAutoScrollIfEnabled } from "./auto-scroll";
import { updatePageData } from "./progress-bar";

export interface ChapterContext {
    chapterStartIndex: number;
    imagesBasePath: string;
    pageCount: number;
}

export interface RestorePosition {
    index: number;
    offset: number;
}

let currentChapterIndex = -1;
let imageDelegationAttached = false;

function getLocalIndex(target: EventTarget | null): number | null {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
    if (!el?.dataset.index) return null;
    const n = Number(el.dataset.index);
    return Number.isNaN(n) ? null : n;
}

function ensureImageDelegation(container: HTMLElement): void {
    if (imageDelegationAttached) return;
    imageDelegationAttached = true;
    container.addEventListener("mousedown", (event: MouseEvent) => {
        const idx = getLocalIndex(event.target);
        if (idx === null) return;
        handleImageMouseDown(event, idx);
    });
    container.addEventListener("click", (event: MouseEvent) => {
        if (getLocalIndex(event.target) === null) return;
        handleImageClick(event);
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

export function loadChapterImages(chapterIndex: number, restore?: RestorePosition): void {
    const manga = getCurrentManga();
    if (!manga) return;
    loadChapterImagesForManga(manga, chapterIndex, restore);
}

function loadChapterImagesForManga(manga: Manga, chapterIndex: number, restore?: RestorePosition): void {
    const totalChapters = getTotalChapters(manga);
    if (chapterIndex < 0 || chapterIndex >= totalChapters) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        loadChapterImages(0);
        return;
    }

    currentChapterIndex = chapterIndex;
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
        CurrentProgress.update("scrollIndex", 0);
        CurrentProgress.update("scrollOffset", 0);
    }
    primeImagePattern(manga);

    emitAppEvent("chapterSelectorSync", { currentChapter: chapterIndex, totalChapters });

    if (pageCount <= 0) {
        emitAppEvent("imageRangeChanged", { end: 0, start: 0, total: 0 });
        return;
    }

    const initialIndex = clamp(restore?.index ?? 0, 0, pageCount - 1);
    const initialOffset = restore?.index === initialIndex ? Math.max(0, restore.offset) : 0;

    let patternSaved = false;

    const virtualizer = mountVirtualizer({
        chapterStartIndex: start,
        container: imageContainer,
        imagesBasePath: manga.imagesFullPath,
        initialIndex,
        initialOffset,
        onIndexChange: (localIndex) => {
            emitAppEvent("visibleImageChanged", { imageIndex: localIndex });
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
            emitAppEvent("imageRangeChanged", { end: globalEnd, start: globalStart + 1, total: manga.totalImages });
        },
        pageCount,
    });

    const chapterContext: ChapterContext = {
        chapterStartIndex: start,
        imagesBasePath: manga.imagesFullPath,
        pageCount,
    };
    setLightboxContext({ ...chapterContext, onNavigate: (localIndex) => scrollToActiveIndex(localIndex, 0, "smooth") });
    initScrubber(chapterContext, initialIndex);
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
    const newChapter = currentChapterIndex + direction;
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
    if (currentChapterIndex !== 0) {
        loadChapterImages(0);
    }
}

export function goToLastChapter(): void {
    const manga = getCurrentManga();
    if (!manga) return;

    const lastChapterIndex = getTotalChapters(manga) - 1;
    if (currentChapterIndex !== lastChapterIndex) {
        loadChapterImages(lastChapterIndex);
    }
}

export function reloadCurrentChapter(): void {
    if (currentChapterIndex === -1) return;
    loadChapterImages(currentChapterIndex, getActiveScrollAnchor() ?? undefined);
}

// Handle clicks on images for scrolling
function handleImageClick(event: MouseEvent): void {
    if (isLightboxLongPress()) {
        resetLongPressFlag();
        return;
    }

    const y = event.clientY;
    const third = window.innerHeight / 3;
    if (y >= third && y <= third * 2) return;

    const direction = y < third ? -1 : 1;
    const startPosition = window.scrollY;
    animateScrollTo(startPosition, Math.max(0, startPosition + direction * CurrentSettings.scrollAmount));
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

// --- Global Event Listeners ---

function handleScroll(): void {
    if (PersistState.currentView === "viewer") {
        debouncedSaveScroll();
    }
}

window.addEventListener("scroll", handleScroll, { passive: true });
