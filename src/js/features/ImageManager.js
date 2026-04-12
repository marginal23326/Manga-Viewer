import { navigateLightbox } from "../components/Lightbox";
import { handleImageMouseDown, handleImageMouseUp, isLongPress, resetLongPressFlag } from "../components/Lightbox";
import Config from "../core/Config";
import { DOM, $$, addClass, h } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";
import { PersistState, LightboxState } from "../core/State";
import { showSpinner, hideSpinner, getChapterBounds, debounce, easeInOutCubic, scrollToView } from "../core/Utils";

import { resumeAutoScrollIfEnabled } from "./AutoScroll";
import { getCurrentManga } from "./MangaManager";
import { updateImageRangeDisplay } from "./NavigationManager";
import { updatePageData } from "./ProgressBar";
import { initScrubber, updateScrubberState, teardownScrubber, setScrubberEnabled } from "./ScrubberManager";
import { loadMangaSettings, saveMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";
import { applyCurrentZoom, applySpacing } from "./ZoomManager";

let currentChapterIndex = -1;
let isLoadingChapter = false;
let visibleImageObserver = null; // For tracking visible image index
let activeLoadToken = 0;

function createImageSlot() {
    const placeholder = h("div", {
        className:
            "w-full max-w-5xl min-h-24 mx-auto border-2 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 animate-pulse",
    });

    const slot = h("div", { className: "w-full flex justify-center" }, placeholder);
    return slot;
}

function prepareChapterImage(img, imageIndex) {
    img.loading = "lazy";
    img.dataset.index = imageIndex;
    addClass(img, "manga-image block max-w-full h-auto mx-auto cursor-pointer");
    img.addEventListener("mousedown", handleImageMouseDown);
    img.addEventListener("mouseup", handleImageMouseUp);
    img.addEventListener("contextmenu", (e) => {
        if (isLongPress) e.preventDefault();
    });
    img.addEventListener("click", handleImageClick);
}

function waitForNextPaint() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
        });
    });
}

function isStaleLoad(loadToken, mangaId) {
    const manga = getCurrentManga();
    return activeLoadToken !== loadToken || !manga || manga.id !== mangaId;
}

function finalizeChapterLoad(chapterIndex, loadToken, mangaId) {
    if (isStaleLoad(loadToken, mangaId)) {
        return;
    }

    applyCurrentZoom();
    applySpacing();
    updatePageData();
    restoreScrollPosition();

    const settings = loadMangaSettings(mangaId);
    setScrubberEnabled(settings.scrubberEnabled !== false);
    initScrubber(chapterIndex);
    setupVisibleImageObserver();
    hideSpinner();
    isLoadingChapter = false;

    settings.currentChapter = chapterIndex;
    saveMangaSettings(mangaId, settings);

    preloadNextChapter(chapterIndex);
}

export function invalidateChapterLoad({ clearImages = false } = {}) {
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

/**
 * Loads and displays images for a specific chapter.
 * @param {number} chapterIndex - The 0-based index of the chapter to load.
 */
export async function loadChapterImages(chapterIndex) {
    const manga = getCurrentManga();
    if (!manga) return;

    const mangaId = manga.id;
    if (chapterIndex < 0 || chapterIndex >= manga.totalChapters) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        loadChapterImages(0); // Default to first chapter
        return;
    }

    const loadToken = ++activeLoadToken;
    isLoadingChapter = true;
    currentChapterIndex = chapterIndex;
    showSpinner();
    teardownVisibleImageObserver();
    teardownScrubber();

    const imageContainer = DOM.imageContainer;
    if (!imageContainer) {
        console.error("Image container not found!");
        hideSpinner();
        isLoadingChapter = false;
        return;
    }
    imageContainer.innerHTML = "";

    const { start, end } = getChapterBounds(manga, chapterIndex);
    const settings = loadMangaSettings(mangaId);
    const shouldDelaySpinnerHide = (settings.scrollPosition || 0) > 0;
    const imageSlots = [];
    const imagePromises = [];
    let loadedCount = 0;
    let hasVisibleContent = false;

    const slotFragment = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
        const slot = createImageSlot();
        imageSlots.push(slot);
        slotFragment.appendChild(slot);
    }
    imageContainer.appendChild(slotFragment);

    updateChapterSelectorOptions(manga.totalChapters, chapterIndex);

    // Start loading chapter images and fill their slots as they resolve.
    for (let i = start; i < end; i++) {
        const imageIndex = i + 1;
        const slot = imageSlots[i - start];
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
            .catch((error) => {
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
}

export function navigateImage(direction) {
    if (LightboxState.isOpen) {
        navigateLightbox(direction);
        return;
    }

    const mainImages = $$("img.manga-image", DOM.imageContainer);
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

function changeChapter(direction) {
    const manga = getCurrentManga();
    if (isLoadingChapter || !manga) return;
    const newChapter = currentChapterIndex + direction;
    if (newChapter >= 0 && newChapter < manga.totalChapters) {
        resetScrollAndLoadChapter(newChapter);
    } else {
        console.log(`Already at ${direction > 0 ? "last" : "first"} chapter.`);
    }
}

export function loadNextChapter() {
    changeChapter(1);
}
export function loadPreviousChapter() {
    changeChapter(-1);
}

export function goToFirstChapter() {
    if (currentChapterIndex !== 0) {
        resetScrollAndLoadChapter(0);
    }
}

export function goToLastChapter() {
    const manga = getCurrentManga();
    if (!manga) return;
    const lastChapterIndex = manga.totalChapters - 1;
    if (currentChapterIndex !== lastChapterIndex) {
        resetScrollAndLoadChapter(lastChapterIndex);
    }
}

export function reloadCurrentChapter() {
    if (currentChapterIndex !== -1 && !isLoadingChapter) {
        loadChapterImages(currentChapterIndex);
    }
}

// --- Scrolling & Position ---

export function saveCurrentScrollPosition() {
    const manga = getCurrentManga();
    if (!manga) return;

    if (isLoadingChapter) return;
    if (DOM.imageContainer && DOM.imageContainer.children.length === 0) return;

    const settings = loadMangaSettings(manga.id);
    settings.scrollPosition = window.scrollY || document.documentElement.scrollTop;
    saveMangaSettings(manga.id, settings);
}

// Debounced version for scroll event listener
export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

export function resetScrollAndLoadChapter(chapterIndex) {
    const manga = getCurrentManga();
    if (!manga) return;
    const settings = loadMangaSettings(manga.id);
    settings.scrollPosition = 0;
    saveMangaSettings(manga.id, settings);
    window.scrollTo({ top: 0, behavior: "instant" });
    loadChapterImages(chapterIndex);
}

function restoreScrollPosition() {
    const manga = getCurrentManga();
    if (!manga) return;
    const settings = loadMangaSettings(manga.id);
    const targetPosition = settings.scrollPosition || 0;

    let ended = false;
    const scrollEnded = () => {
        if (ended) return;
        ended = true;
        resumeAutoScrollIfEnabled();
        window.removeEventListener("scrollend", scrollEnded);
    };

    requestAnimationFrame(() => {
        if ("scrollBehavior" in document.documentElement.style) {
            window.addEventListener("scrollend", scrollEnded, { once: true });
            window.scrollTo({ top: targetPosition, behavior: "smooth" });

            // Fallback for browsers that might not fire scrollend properly
            if (window.scrollY === targetPosition) {
                scrollEnded();
            }
        } else {
            window.scrollTo(0, targetPosition);
            resumeAutoScrollIfEnabled();
        }
    });
}

// Handle clicks on images for scrolling
function handleImageClick(event) {
    if (isLongPress) {
        resetLongPressFlag();
        return;
    }

    const clickY = event.clientY;
    const viewportHeight = window.innerHeight;
    const manga = getCurrentManga();
    const settings = manga ? loadMangaSettings(manga.id) : {};
    const scrollAmount = settings.scrollAmount || Config.DEFAULT_SCROLL_AMOUNT;
    const duration = 300;
    let start = null;
    const startPosition = window.scrollY;
    let endPosition;

    if (clickY < viewportHeight / 3) {
        endPosition = Math.max(0, startPosition - scrollAmount);
    } else if (clickY > viewportHeight * (2 / 3)) {
        endPosition = startPosition + scrollAmount;
    } else {
        return; // Do nothing if clicked in the middle third
    }

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        const easedPercentage = easeInOutCubic(percentage);
        window.scrollTo(0, startPosition + (endPosition - startPosition) * easedPercentage);
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

// --- Image Visibility Tracking (for Scrubber) ---

function setupVisibleImageObserver() {
    teardownVisibleImageObserver();
    const options = {
        root: null,
        rootMargin: `-${window.innerHeight / 2 - 1}px 0px -${window.innerHeight / 2}px 0px`,
        threshold: 0,
    };
    visibleImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const imageIndex = parseInt(entry.target.dataset.index, 10);
                updateScrubberState({ visibleImageIndex: imageIndex });
            }
        });
    }, options);
    const images = $$("img.manga-image", DOM.imageContainer);
    images.forEach((img) => visibleImageObserver.observe(img));
}

function teardownVisibleImageObserver() {
    if (visibleImageObserver) {
        visibleImageObserver.disconnect();
        visibleImageObserver = null;
    }
}

// --- Preloading ---

async function preloadNextChapter(loadedChapterIndex) {
    const manga = getCurrentManga();
    if (!manga) return;
    const nextChapterIndex = loadedChapterIndex + 1;
    if (nextChapterIndex < manga.totalChapters) {
        const { start, end } = getChapterBounds(manga, nextChapterIndex);
        const preloadCount = 3;
        for (let i = start; i < Math.min(start + preloadCount, end); i++) {
            loadImage(manga.imagesFullPath, i + 1);
        }
    }
}

// --- Global Event Listeners ---

function handleScroll() {
    if (PersistState.currentView === "viewer" && !isLoadingChapter) {
        debouncedSaveScroll();
    }
}

// --- Initialization ---

export function initImageManager() {
    window.addEventListener("scroll", handleScroll, { passive: true });
}

/**
 * Scrolls the view smoothly to the specified image index.
 * @param {number} imageIndex - The zero-based index of the image to scroll to.
 */
export function scrollToImage(imageIndex) {
    if (!DOM.imageContainer) return;
    const images = $$("img.manga-image", DOM.imageContainer);
    const targetImage = images[imageIndex];
    if (targetImage) {
        scrollToView(targetImage);
    }
}
