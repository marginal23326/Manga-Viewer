import { DOM, addClass, h } from "@/core/dom-utils";
import { LightboxState, PersistState } from "@/state/state";
import {
    animateScrollTo,
    getChapterBounds,
    getMangaImages,
    hideSpinner,
    scrollToView,
    showSpinner,
    toInt,
    waitForNextPaint,
} from "@/core/utils";
import { applyCurrentZoom, applySpacing } from "./zoom-manager";
import { debouncedSaveScroll, restoreSavedScrollPosition, saveCurrentScrollPosition } from "@/viewer/viewer-scroll";
import { getCurrentManga, withCurrentManga } from "@/state/manga-library";
import { getResolvedPattern, loadImage, seedResolvedPattern } from "@/viewer/image-loader";
import { getSettings, updateSettings } from "@/state/manga-settings";
import { handleImageMouseDown, handleImageMouseUp, navigateLightbox, resetLongPressFlag } from "@/components/lightbox";
import { initScrubber, setScrubberEnabled, teardownScrubber, updateScrubberState } from "./scrubber-manager";
import Config from "@/core/config";
import { emitAppEvent } from "@/core/app-events";
import { resumeAutoScrollIfEnabled } from "./auto-scroll";
import { updateImageRangeDisplay } from "@/viewer/status-display";
import { updatePageData } from "./progress-bar";

let currentChapterIndex = -1;
let isLoadingChapter = false;
let visibleImageObserver: IntersectionObserver | null = null;
let activeLoadToken = 0;

function createImageSlot(): HTMLDivElement {
    const placeholder = h("div", {
        className:
            "w-full max-w-5xl min-h-24 mx-auto border-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 animate-pulse",
    });

    return h("div", { className: "w-full flex justify-center" }, placeholder);
}

function prepareChapterImage(img: HTMLImageElement, imageIndex: number): void {
    img.loading = "lazy";
    img.dataset.index = String(imageIndex);
    addClass(img, "manga-image block max-w-full h-auto mx-auto cursor-pointer");
    img.addEventListener("mousedown", handleImageMouseDown);
    img.addEventListener("mouseup", handleImageMouseUp);
    img.addEventListener("contextmenu", (event) => {
        if (LightboxState.isLongPress) event.preventDefault();
    });
    img.addEventListener("click", handleImageClick);
}

function isStaleLoad(loadToken: number, mangaId: string): boolean {
    const manga = getCurrentManga();
    return activeLoadToken !== loadToken || !manga || manga.id !== mangaId;
}

function finalizeChapterLoad(chapterIndex: number, loadToken: number, mangaId: string): void {
    if (isStaleLoad(loadToken, mangaId)) {
        return;
    }

    applyCurrentZoom();
    applySpacing();
    updatePageData();
    restoreSavedScrollPosition({ onComplete: resumeAutoScrollIfEnabled });

    const settings = getSettings(mangaId);
    setScrubberEnabled(settings.scrubberEnabled !== false);
    initScrubber(chapterIndex);
    setupVisibleImageObserver();
    hideSpinner();
    isLoadingChapter = false;

    const manga = getCurrentManga();
    const imagePattern = manga ? getResolvedPattern(manga.imagesFullPath) : null;
    updateSettings(mangaId, { currentChapter: chapterIndex, ...(imagePattern && { imagePattern }) });

    preloadNextChapter(chapterIndex);
}

export interface InvalidateChapterLoadOptions {
    clearImages?: boolean;
}

export function invalidateChapterLoad({ clearImages = false }: InvalidateChapterLoadOptions = {}): void {
    activeLoadToken++;
    const wasLoading = isLoadingChapter;
    isLoadingChapter = false;
    teardownVisibleImageObserver();
    teardownScrubber();
    hideSpinner();

    if (clearImages && DOM.imageContainer) {
        // Prevent clearing from overwriting our saved scroll position with 0
        if (!wasLoading) {
            saveCurrentScrollPosition();
        }
        DOM.imageContainer.innerHTML = "";
    }
}

export function loadChapterImages(chapterIndex: number): void {
    void withCurrentManga(async (manga) => {
        const mangaId = manga.id;
        if (chapterIndex < 0 || chapterIndex >= manga.totalChapters) {
            console.warn(`Invalid chapter index requested: ${chapterIndex}`);
            // Fall back to the first chapter.
            loadChapterImages(0);
            return;
        }

        const loadToken = ++activeLoadToken;
        isLoadingChapter = true;
        currentChapterIndex = chapterIndex;
        showSpinner();
        teardownVisibleImageObserver();
        teardownScrubber();

        const { imageContainer } = DOM;
        if (!imageContainer) {
            console.error("Image container not found!");
            hideSpinner();
            isLoadingChapter = false;
            return;
        }
        imageContainer.innerHTML = "";

        const { start, end } = getChapterBounds(manga, chapterIndex);
        const settings = getSettings(mangaId);
        if (settings.imagePattern) {
            seedResolvedPattern(manga.imagesFullPath, settings.imagePattern);
        }
        const shouldDelaySpinnerHide = (settings.scrollPosition ?? 0) > 0;
        const imageSlots: HTMLDivElement[] = [];
        const imagePromises: Promise<HTMLImageElement | null>[] = [];
        let loadedCount = 0;
        let hasVisibleContent = false;

        const slotFragment = document.createDocumentFragment();
        for (let i = start; i < end; i++) {
            const slot = createImageSlot();
            imageSlots.push(slot);
            slotFragment.append(slot);
        }
        imageContainer.append(slotFragment);

        emitAppEvent("chapterSelectorSync", { currentChapter: chapterIndex, totalChapters: manga.totalChapters });

        // Start loading chapter images and fill their slots as they resolve.
        for (let i = start; i < end; i++) {
            const imageIndex = i + 1;
            const slot = imageSlots[i - start];
            if (!slot) continue;

            const imgPromise = loadImage(manga.imagesFullPath, imageIndex)
                .then((img) => {
                    if (isStaleLoad(loadToken, mangaId)) {
                        return null;
                    }

                    if (img) {
                        prepareChapterImage(img, i);
                        slot.replaceChildren(img);
                        loadedCount++;

                        updateImageRangeDisplay(start + 1, start + loadedCount, manga.totalImages);

                        if (!hasVisibleContent && !shouldDelaySpinnerHide) {
                            hasVisibleContent = true;
                            hideSpinner();
                        }

                        return img;
                    }
                    slot.remove();
                    return null;
                })
                .catch((error: unknown) => {
                    if (isStaleLoad(loadToken, mangaId)) {
                        return null;
                    }
                    console.error(`Error loading image index ${imageIndex}:`, error);
                    slot.remove();
                    return null;
                });
            imagePromises.push(imgPromise);
        }

        await Promise.allSettled(imagePromises);

        if (isStaleLoad(loadToken, mangaId)) {
            return;
        }

        if (loadedCount === 0) {
            updateImageRangeDisplay(0, 0, 0);
        }

        if (!hasVisibleContent && !shouldDelaySpinnerHide) {
            hideSpinner();
        }

        await waitForNextPaint();
        finalizeChapterLoad(chapterIndex, loadToken, mangaId);
    });
}

export function navigateImage(direction: number): void {
    if (LightboxState.isOpen) {
        navigateLightbox(direction);
        return;
    }

    const mainImages = getMangaImages();
    const numImages = mainImages.length;

    const manga = getCurrentManga();
    if (!manga || numImages === 0) {
        return;
    }

    const viewportTopOffset = 1;
    let currentImageIndex = mainImages.findIndex((img) => img.getBoundingClientRect().bottom > viewportTopOffset);

    if (currentImageIndex === -1) {
        currentImageIndex = numImages - 1;
    }

    const targetIndex = Math.max(0, Math.min(currentImageIndex + direction, numImages - 1));
    const targetImage = mainImages[targetIndex];

    if (targetImage && (targetIndex !== currentImageIndex || targetIndex === 0 || targetIndex === numImages - 1)) {
        scrollToView(targetImage);
    }
}

// --- Chapter Navigation ---

function changeChapter(direction: number): void {
    const manga = getCurrentManga();
    if (isLoadingChapter || !manga) return;
    const newChapter = currentChapterIndex + direction;
    if (newChapter >= 0 && newChapter < manga.totalChapters) {
        resetScrollAndLoadChapter(newChapter);
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
        resetScrollAndLoadChapter(0);
    }
}

export function goToLastChapter(): void {
    withCurrentManga((manga) => {
        const lastChapterIndex = manga.totalChapters - 1;
        if (currentChapterIndex !== lastChapterIndex) {
            resetScrollAndLoadChapter(lastChapterIndex);
        }
    });
}

export function reloadCurrentChapter(): void {
    if (currentChapterIndex !== -1 && !isLoadingChapter) {
        loadChapterImages(currentChapterIndex);
    }
}

// --- Scrolling & Position ---

export function resetScrollAndLoadChapter(chapterIndex: number): void {
    withCurrentManga((manga) => {
        updateSettings(manga.id, { scrollPosition: 0 });
        window.scrollTo({ behavior: "instant", top: 0 });
        loadChapterImages(chapterIndex);
    });
}

// Handle clicks on images for scrolling
function handleImageClick(event: MouseEvent): void {
    if (LightboxState.isLongPress) {
        resetLongPressFlag();
        return;
    }

    const clickY = event.clientY;
    const viewportHeight = window.innerHeight;
    const manga = getCurrentManga();
    const settings = manga ? getSettings(manga.id) : {};
    const scrollAmount = settings.scrollAmount ?? Config.DEFAULT_SCROLL_AMOUNT;
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

// --- Image Visibility Tracking (for Scrubber) ---

function setupVisibleImageObserver(): void {
    teardownVisibleImageObserver();
    const options: IntersectionObserverInit = {
        root: null,
        rootMargin: `-${window.innerHeight / 2 - 1}px 0px -${window.innerHeight / 2}px 0px`,
        threshold: 0,
    };
    visibleImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const imageIndex = toInt((entry.target as HTMLElement).dataset.index);
                updateScrubberState({ visibleImageIndex: imageIndex });
            }
        });
    }, options);
    const images = getMangaImages();
    images.forEach((img) => visibleImageObserver?.observe(img));
}

function teardownVisibleImageObserver(): void {
    if (visibleImageObserver) {
        visibleImageObserver.disconnect();
        visibleImageObserver = null;
    }
}

// --- Preloading ---

function preloadNextChapter(loadedChapterIndex: number): void {
    withCurrentManga((manga) => {
        const nextChapterIndex = loadedChapterIndex + 1;
        if (nextChapterIndex < manga.totalChapters) {
            const { start, end } = getChapterBounds(manga, nextChapterIndex);
            const preloadCount = 3;
            for (let i = start; i < Math.min(start + preloadCount, end); i++) {
                void loadImage(manga.imagesFullPath, i + 1);
            }
        }
    });
}

// --- Global Event Listeners ---

function handleScroll(): void {
    if (PersistState.currentView === "viewer" && !isLoadingChapter) {
        debouncedSaveScroll();
    }
}

// --- Initialization ---

export function initImageManager(): void {
    window.addEventListener("scroll", handleScroll, { passive: true });
}
