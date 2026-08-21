import { DOM, addClass, animateScrollTo, hideSpinner, showSpinner } from "@/core/dom-utils";
import {
    PersistState,
    getChapterBounds,
    getCurrentManga,
    getCurrentSettings,
    getTotalChapters,
    updateSettings,
} from "@/state";
import { debouncedSaveScroll, saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { destroyActiveVirtualizer, getActiveScrollAnchor, mountVirtualizer, scrollToActiveIndex } from "./virtualizer";
import { emitAppEvent, onAppEvent } from "@/core/app-events";
import {
    handleImageMouseDown,
    handleImageMouseUp,
    isLightboxLongPress,
    isLightboxOpen,
    navigateLightbox,
    resetLongPressFlag,
    setLightboxContext,
} from "./lightbox";
import { initScrubber, setScrubberEnabled, teardownScrubber } from "./scrubber";
import { loadImage, persistResolvedImagePattern, primeImagePattern } from "@/viewer/image-loader";
import Config from "@/core/config";
import type { Manga } from "@/types";
import { clamp } from "@/core/utils";
import { resumeAutoScrollIfEnabled } from "./auto-scroll";
import { updateImageRangeDisplay } from "./nav-bar";
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

function prepareChapterImage(img: HTMLImageElement, localIndex: number): void {
    addClass(img, "manga-image block max-w-full h-auto mx-auto cursor-pointer");
    img.addEventListener("mousedown", (event) => handleImageMouseDown(event, localIndex));
    img.addEventListener("mouseup", handleImageMouseUp);
    img.addEventListener("contextmenu", (event) => {
        if (isLightboxLongPress()) event.preventDefault();
    });
    img.addEventListener("click", handleImageClick);
}

export interface InvalidateChapterLoadOptions {
    clearImages?: boolean;
}

export function invalidateChapterLoad({ clearImages = false }: InvalidateChapterLoadOptions = {}): void {
    if (clearImages) {
        saveCurrentScrollPosition();
    }

    setLightboxContext(null);
    destroyActiveVirtualizer();
    teardownScrubber();
    hideSpinner();

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
    showSpinner();
    setLightboxContext(null);
    destroyActiveVirtualizer();
    teardownScrubber();

    const { imageContainer } = DOM;
    if (!imageContainer) {
        console.error("Image container not found!");
        hideSpinner();
        return;
    }
    imageContainer.replaceChildren();

    const { start, end } = getChapterBounds(manga, chapterIndex);
    const pageCount = end - start;
    updateSettings(
        manga.id,
        restore ? { currentChapter: chapterIndex } : { currentChapter: chapterIndex, scrollIndex: 0, scrollOffset: 0 },
    );
    primeImagePattern(manga);

    emitAppEvent("chapterSelectorSync", { currentChapter: chapterIndex, totalChapters });

    if (pageCount <= 0) {
        updateImageRangeDisplay(0, 0, 0);
        hideSpinner();
        return;
    }

    const initialIndex = clamp(restore?.index ?? 0, 0, pageCount - 1);
    const initialOffset = restore?.index === initialIndex ? Math.max(0, restore.offset) : 0;

    setScrubberEnabled(getCurrentSettings().scrubberEnabled);

    let patternSaved = false;

    const virtualizer = mountVirtualizer({
        chapterStartIndex: start,
        container: imageContainer,
        getSettings: () => {
            const s = getCurrentSettings();
            return {
                collapseSpacing: s.collapseSpacing,
                imageFit: s.imageFit,
                spacingAmount: s.spacingAmount,
                zoomLevel: s.zoomLevel,
            };
        },
        imagesBasePath: manga.imagesFullPath,
        initialIndex,
        initialOffset,
        onIndexChange: (localIndex) => {
            emitAppEvent("visibleImageChanged", { imageIndex: localIndex });
        },
        onMount: (img, localIndex) => {
            prepareChapterImage(img, localIndex);
            if (!patternSaved) {
                patternSaved = true;
                persistResolvedImagePattern(manga);
            }
        },
        onNearEnd: () => preloadNextChapter(manga, chapterIndex),
        onRangeChange: (globalStart, globalEnd) => {
            updateImageRangeDisplay(globalStart + 1, globalEnd, manga.totalImages);
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

    hideSpinner();
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

    const clickY = event.clientY;
    const viewportHeight = window.innerHeight;
    const { scrollAmount } = getCurrentSettings();
    const startPosition = window.scrollY;
    let endPosition: number;

    if (clickY < viewportHeight / 3) {
        endPosition = Math.max(0, startPosition - scrollAmount);
    } else if (clickY > viewportHeight * (2 / 3)) {
        endPosition = startPosition + scrollAmount;
    } else {
        // Do nothing if clicked in the middle third.
        return;
    }

    animateScrollTo(startPosition, endPosition);
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

// --- Initialization ---

export function initChapterViewer(): void {
    onAppEvent("viewerScroll", handleScroll);
}
