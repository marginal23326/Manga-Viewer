import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { DOM, $, $$, showElement, hideElement, addClass, removeClass, setText } from '../core/DOMUtils';
import { loadImage } from '../core/ImageLoader';
import { showSpinner, hideSpinner, getChapterBounds, debounce, easeInOutCubic } from '../core/Utils';
import { loadMangaSettings, saveMangaSettings } from './SettingsManager';
import { updateImageRangeDisplay } from './NavigationManager';
import { updateChapterSelectorOptions } from './SidebarManager'; // To update dropdown
import { applyCurrentZoom, applySpacing } from './ZoomManager'; // Will create ZoomManager next
import { initScrubber, updateScrubberState, teardownScrubber } from './ScrubberManager'; // Will create ScrubberManager next
import imagesLoaded from 'imagesloaded'; // Import imagesLoaded library

let currentChapterIndex = -1;
let isLoadingChapter = false;
let visibleImageObserver = null; // For tracking visible image index

// --- Core Image Loading & Display ---

/**
 * Loads and displays images for a specific chapter.
 * @param {number} chapterIndex - The 0-based index of the chapter to load.
 */
export async function loadChapterImages(chapterIndex) {
    if (isLoadingChapter || !AppState.currentManga) return;
    if (chapterIndex < 0 || chapterIndex >= AppState.currentManga.totalChapters) {
        console.warn(`Invalid chapter index requested: ${chapterIndex}`);
        // Optionally load first/last chapter or show error
        loadChapterImages(0); // Default to first chapter
        return;
    }

    isLoadingChapter = true;
    currentChapterIndex = chapterIndex;
    showSpinner();
    teardownScrubber(); // Remove listeners/clear state from previous chapter's scrubber

    const imageContainer = DOM.imageContainer;
    if (!imageContainer) {
        console.error("Image container not found!");
        hideSpinner();
        isLoadingChapter = false;
        return;
    }
    imageContainer.innerHTML = ''; // Clear previous chapter's images

    const { start, end } = getChapterBounds(AppState.currentManga, chapterIndex);
    const imagePromises = [];

    // Create image elements and start loading
    for (let i = start; i < end; i++) {
        const imageIndex = i + 1; // 1-based index for loadImage
        const imgPromise = loadImage(AppState.currentManga.imagesFullPath, imageIndex)
            .then(img => {
                if (img) {
                    // Set attributes for lazy loading and identification
                    img.loading = 'lazy'; // Native browser lazy loading
                    img.dataset.index = i; // 0-based index within chapter bounds
                    addClass(img, 'manga-image block max-w-full h-auto mx-auto cursor-pointer'); // Basic styling
                    // Add event listeners (click for scroll, long-press for lightbox)
                    img.addEventListener('click', handleImageClick);
                    // Lightbox handling will be added later
                    // img.addEventListener('mousedown', handleImageMouseDown);
                    // img.addEventListener('mouseup', handleImageMouseUp);
                    return img;
                }
                return null; // Return null if image failed to load
            })
            .catch(error => {
                console.error(`Error loading image index ${imageIndex}:`, error);
                return null; // Return null on error
            });
        imagePromises.push(imgPromise);
    }

    // Wait for all loadImage calls to resolve (or reject)
    const loadedImages = await Promise.all(imagePromises);

    // Append successfully loaded images to a fragment
    const fragment = document.createDocumentFragment();
    let loadedCount = 0;
    loadedImages.forEach(img => {
        if (img) {
            fragment.appendChild(img);
            loadedCount++;
        } else {
            // Optionally add a placeholder for failed images
            // const placeholder = document.createElement('div');
            // addClass(placeholder, 'h-40 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 flex items-center justify-center my-2');
            // setText(placeholder, 'Image failed to load');
            // fragment.appendChild(placeholder);
        }
    });

    // Append the fragment to the container
    imageContainer.appendChild(fragment);

    // Update UI elements
    updateImageRangeDisplay(start + 1, start + loadedCount, AppState.currentManga.totalImages);
    updateChapterSelectorOptions(AppState.currentManga.totalChapters, chapterIndex);

    // Use imagesLoaded to wait for all appended images (including lazy-loaded ones near viewport) to render
    imagesLoaded(imageContainer)
        .on('progress', (instance, image) => {
            // console.log('Image loaded:', image.img.src); // DEBUG
        })
        .on('always', () => {
            applyCurrentZoom(); // Apply zoom settings from ZoomManager
            applySpacing(); // Apply spacing settings from ZoomManager
            restoreScrollPosition(); // Restore scroll position for this chapter
            initScrubber(); // Initialize scrubber for the new set of images
            setupVisibleImageObserver(); // Start observing images for scrubber updates
            hideSpinner();
            isLoadingChapter = false;

            // Preload next chapter (optional)
            preloadNextChapter(chapterIndex);
        })
        .on('fail', (instance) => {
             console.warn(`imagesLoaded: ${instance.images.length - instance.progressedCount} images failed to load`);
             // Still proceed even if some fail
             applyCurrentZoom();
             applySpacing();
             restoreScrollPosition();
             initScrubber();
             setupVisibleImageObserver();
             hideSpinner();
             isLoadingChapter = false;
             preloadNextChapter(chapterIndex);
        });

    // Update manga settings with the current chapter
    const settings = loadMangaSettings(AppState.currentManga.id);
    settings.currentChapter = chapterIndex;
    saveMangaSettings(AppState.currentManga.id, settings);
}

// --- Chapter Navigation ---

function changeChapter(direction) {
    if (isLoadingChapter || !AppState.currentManga) return;

    const newChapter = currentChapterIndex + direction;

    if (newChapter >= 0 && newChapter < AppState.currentManga.totalChapters) {
        // Save scroll position of the chapter we are leaving
        saveCurrentScrollPosition(currentChapterIndex); // Save for the chapter index we are currently on
        // Reset scroll position in settings for the *new* chapter before loading
        const settings = loadMangaSettings(AppState.currentManga.id);
        settings.scrollPosition = 0; // Reset scroll for the upcoming chapter
        saveMangaSettings(AppState.currentManga.id, settings);

        loadChapterImages(newChapter);
    } else {
        console.log(`Already at ${direction > 0 ? 'last' : 'first'} chapter.`);
        // Optionally provide feedback (e.g., flash nav button)
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
        saveCurrentScrollPosition(currentChapterIndex);
        const settings = loadMangaSettings(AppState.currentManga.id);
        settings.scrollPosition = 0;
        saveMangaSettings(AppState.currentManga.id, settings);
        loadChapterImages(0);
    }
}

export function goToLastChapter() {
    if (!AppState.currentManga) return;
    const lastChapterIndex = AppState.currentManga.totalChapters - 1;
    if (currentChapterIndex !== lastChapterIndex) {
        saveCurrentScrollPosition(currentChapterIndex);
        const settings = loadMangaSettings(AppState.currentManga.id);
        settings.scrollPosition = 0;
        saveMangaSettings(AppState.currentManga.id, settings);
        loadChapterImages(lastChapterIndex);
    }
}

export function reloadCurrentChapter() {
     if (currentChapterIndex !== -1 && !isLoadingChapter) {
         console.log("Reloading current chapter.");
         // Don't save scroll position, just reload
         loadChapterImages(currentChapterIndex);
     }
}

// --- Scrolling & Position ---

function saveCurrentScrollPosition(chapterIdx = currentChapterIndex) {
    if (!AppState.currentManga || chapterIdx === -1) return;

    const settings = loadMangaSettings(AppState.currentManga.id);
    // Only save scroll position for the chapter we are actually viewing
    if (settings.currentChapter === chapterIdx) {
        settings.scrollPosition = window.scrollY || document.documentElement.scrollTop;
        saveMangaSettings(AppState.currentManga.id, settings);
        // console.log(`Saved scroll ${settings.scrollPosition} for chapter ${chapterIdx}`); // DEBUG
    }
}

// Debounced version for scroll event listener
const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

function restoreScrollPosition() {
    if (!AppState.currentManga) return;
    const settings = loadMangaSettings(AppState.currentManga.id);
    const targetPosition = settings.scrollPosition || 0;
    // console.log(`Restoring scroll to ${targetPosition} for chapter ${settings.currentChapter}`); // DEBUG

    // Use requestAnimationFrame to ensure layout is stable after imagesLoaded
    requestAnimationFrame(() => {
        // Use smooth scroll if supported, otherwise jump instantly
        // The slight delay from imagesLoaded + rAF usually makes smooth scroll less jarring
        if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        } else {
            window.scrollTo(0, targetPosition);
        }
    });
}

// Handle clicks on images for scrolling
function handleImageClick(event) {
    // Prevent scroll if lightbox is planned (e.g., based on long-press flag)
    // if (isLongPress) return;

    const clickY = event.clientY;
    const viewportHeight = window.innerHeight;
    const settings = loadMangaSettings(AppState.currentManga?.id);
    const scrollAmount = settings.scrollAmount || Config.DEFAULT_SCROLL_AMOUNT;
    const duration = 300; // ms for smooth scroll animation
    let start = null;
    const startPosition = window.scrollY;
    let endPosition;

    if (clickY < viewportHeight / 3) { // Scroll up if clicked in top third
        endPosition = Math.max(0, startPosition - scrollAmount);
    } else if (clickY > viewportHeight * (2 / 3)) { // Scroll down if clicked in bottom third
        endPosition = startPosition + scrollAmount;
    } else {
        return; // Do nothing if clicked in the middle third
    }

    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        const easedPercentage = easeInOutCubic(percentage); // Apply easing

        window.scrollTo(0, startPosition + (endPosition - startPosition) * easedPercentage);

        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

// --- Image Visibility Tracking (for Scrubber) ---

function setupVisibleImageObserver() {
    teardownVisibleImageObserver(); // Clear previous observer

    const options = {
        root: null, // Use viewport
        rootMargin: `-${window.innerHeight / 2 - 1}px 0px -${window.innerHeight / 2}px 0px`, // ~Center line of viewport
        threshold: 0, // Trigger as soon as the center line is crossed
    };

    visibleImageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // The image whose center is crossing the viewport center
                const imageIndex = parseInt(entry.target.dataset.index, 10);
                // console.log(`Visible image index updated: ${imageIndex}`); // DEBUG
                updateScrubberState({ visibleImageIndex: imageIndex }); // Update ScrubberManager
            }
        });
    }, options);

    // Observe all images in the container
    const images = $$('img.manga-image', DOM.imageContainer);
    images.forEach(img => visibleImageObserver.observe(img));
}

function teardownVisibleImageObserver() {
    if (visibleImageObserver) {
        visibleImageObserver.disconnect();
        visibleImageObserver = null;
    }
}

// --- Preloading ---

async function preloadNextChapter(loadedChapterIndex) {
    if (!AppState.currentManga) return;
    const nextChapterIndex = loadedChapterIndex + 1;
    if (nextChapterIndex < AppState.currentManga.totalChapters) {
        const { start, end } = getChapterBounds(AppState.currentManga, nextChapterIndex);
        // Preload first few images of the next chapter
        const preloadCount = 3; // Number of images to preload
        for (let i = start; i < Math.min(start + preloadCount, end); i++) {
            await loadImage(AppState.currentManga.imagesFullPath, i + 1);
        }
    }
}


// --- Global Event Listeners ---

function handleScroll() {
    if (AppState.currentView === 'viewer') {
        debouncedSaveScroll(); // Save scroll position after scrolling stops
        // Scrubber update is handled by IntersectionObserver now
    }
}

// --- Initialization ---

export function initImageManager() {
    // Add global scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    console.log("Image Manager Initialized.");
}