import imagesLoaded from "imagesloaded";

import { navigateLightbox } from "../components/Lightbox";
import { handleImageMouseDown, handleImageMouseUp, isLongPress, resetLongPressFlag } from "../components/Lightbox";
import Config from "../core/Config";
import { DOM, $$, addClass } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";
import { State } from "../core/State";
import { showSpinner, hideSpinner, getChapterBounds, debounce, easeInOutCubic, scrollToView } from "../core/Utils";

import { resumeAutoScrollIfEnabled } from "./AutoScroll";
import { updateImageRangeDisplay } from "./NavigationManager";
import { updatePageData } from "./ProgressBar";
import { initScrubber, updateScrubberState, teardownScrubber } from "./ScrubberManager";
import { loadMangaSettings, saveMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";
import { applyCurrentZoom, applySpacing } from "./ZoomManager";

let currentChapterIndex = -1;
let isLoadingChapter = false;
let visibleImageObserver = null; // For tracking visible image index

function finalizeChapterLoad(chapterIndex) {
    applyCurrentZoom();
    applySpacing();
    updatePageData();
    restoreScrollPosition();
    initScrubber(chapterIndex);
    setupVisibleImageObserver();
    hideSpinner();
    isLoadingChapter = false;

    const settings = loadMangaSettings(State.currentManga.id);
    settings.currentChapter = chapterIndex;
    saveMangaSettings(State.currentManga.id, settings);

    preloadNextChapter(chapterIndex);
}

/**
 * Loads and displays images for a specific chapter.
 * @param {number} chapterIndex - The 0-based index of the chapter to load.
 */
export async function loadChapterImages(chapterIndex) {
    if (isLoadingChapter || !State.currentManga) return;
    if (chapterIndex < 0 || chapterIndex >= State.currentManga.totalChapters) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        loadChapterImages(0); // Default to first chapter
        return;
    }

    isLoadingChapter = true;
    currentChapterIndex = chapterIndex;
    showSpinner();
    teardownScrubber();

    const imageContainer = DOM.imageContainer;
    if (!imageContainer) {
        console.error("Image container not found!");
        hideSpinner();
        isLoadingChapter = false;
        return;
    }
    imageContainer.innerHTML = "";

    const { start, end } = getChapterBounds(State.currentManga, chapterIndex);
    const imagePromises = [];

    // Create image elements and start loading
    for (let i = start; i < end; i++) {
        const imageIndex = i + 1;
        const imgPromise = loadImage(State.currentManga.imagesFullPath, imageIndex)
            .then((img) => {
                if (img) {
                    img.loading = "lazy";
                    img.dataset.index = i;
                    addClass(img, "manga-image block max-w-full h-auto mx-auto cursor-pointer");
                    img.addEventListener("mousedown", handleImageMouseDown);
                    img.addEventListener("mouseup", handleImageMouseUp);
                    img.addEventListener("contextmenu", (e) => {
                        if (isLongPress) e.preventDefault();
                    });
                    img.addEventListener("click", handleImageClick);
                    return img;
                }
                return null;
            })
            .catch((error) => {
                console.error(`Error loading image index ${imageIndex}:`, error);
                return null;
            });
        imagePromises.push(imgPromise);
    }

    // Wait for all loadImage calls to resolve (or reject)
    const loadedImages = await Promise.all(imagePromises);

    // Append successfully loaded images to a fragment
    const fragment = document.createDocumentFragment();
    let loadedCount = 0;
    loadedImages.forEach((img) => {
        if (img) {
            fragment.appendChild(img);
            loadedCount++;
        }
    });

    // Append the fragment to the container
    imageContainer.appendChild(fragment);

    // Update UI elements
    updateImageRangeDisplay(start + 1, start + loadedCount, State.currentManga.totalImages);
    updateChapterSelectorOptions(State.currentManga.totalChapters, chapterIndex);

    // Use imagesLoaded to wait for all appended images to render
    imagesLoaded(imageContainer)
        .on("fail", (instance) => {
            console.warn(`imagesLoaded: ${instance.images.length - instance.progressedCount} images failed to load`);
        })
        .on("always", () => {
            finalizeChapterLoad(chapterIndex);
        });
}

export function navigateImage(direction) {
    if (State.lightbox.isOpen) {
        navigateLightbox(direction);
        return;
    }

    const mainImages = $$("img.manga-image", DOM.imageContainer);
    const numImages = mainImages.length;

    if (!State.currentManga || numImages === 0) {
        return;
    }

    const viewportTopOffset = 1;
    let currentImageIndex = mainImages.findIndex(
        (img) => img.getBoundingClientRect().bottom > viewportTopOffset
    );

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
    if (isLoadingChapter || !State.currentManga) return;
    const newChapter = currentChapterIndex + direction;
    if (newChapter >= 0 && newChapter < State.currentManga.totalChapters) {
        resetScrollAndLoadChapter(newChapter);
    } else {
        console.log(`Already at ${direction > 0 ? "last" : "first"} chapter.`);
        // TODO: Optionally provide feedback (e.g., flash nav button)
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
    if (!State.currentManga) return;
    const lastChapterIndex = State.currentManga.totalChapters - 1;
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
    if (!State.currentManga) return;

    const settings = loadMangaSettings(State.currentManga.id);
    settings.scrollPosition = window.scrollY || document.documentElement.scrollTop;
    saveMangaSettings(State.currentManga.id, settings);
}

// Debounced version for scroll event listener
const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

export function resetScrollAndLoadChapter(chapterIndex) {
    if (!State.currentManga) return;
    const settings = loadMangaSettings(State.currentManga.id);
    settings.scrollPosition = 0;
    saveMangaSettings(State.currentManga.id, settings);
    loadChapterImages(chapterIndex);
}

function restoreScrollPosition() {
    if (!State.currentManga) return;
    const settings = loadMangaSettings(State.currentManga.id);
    const targetPosition = settings.scrollPosition || 0;

    const scrollEnded = () => {
        resumeAutoScrollIfEnabled();
        window.removeEventListener("scrollend", scrollEnded);
    };

    requestAnimationFrame(() => {
        if ("scrollBehavior" in document.documentElement.style) {
            window.addEventListener("scrollend", scrollEnded, { once: true });
            window.scrollTo({ top: targetPosition, behavior: "smooth" });

            // Fallback for browsers that might not fire scrollend for instant scrolls
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
    const settings = loadMangaSettings(State.currentManga?.id);
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
    if (!State.currentManga) return;
    const nextChapterIndex = loadedChapterIndex + 1;
    if (nextChapterIndex < State.currentManga.totalChapters) {
        const { start, end } = getChapterBounds(State.currentManga, nextChapterIndex);
        const preloadCount = 3;
        for (let i = start; i < Math.min(start + preloadCount, end); i++) {
            loadImage(State.currentManga.imagesFullPath, i + 1);
        }
    }
}

// --- Global Event Listeners ---

function handleScroll() {
    if (State.currentView === "viewer") {
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
