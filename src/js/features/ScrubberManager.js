import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { DOM, $, $$, addClass, removeClass, toggleClass, setText, setAttribute } from '../core/DOMUtils';
import { loadImage } from '../core/ImageLoader';
import { debounce, getChapterBounds } from '../core/Utils';
import { hideNav } from './NavigationManager'; // To hide nav when scrubber is active

let scrubberParent = null;
let scrubberContainer = null;
let scrubberTrack = null;
let scrubberPreview = null;
let scrubberMarkerActive = null;
let scrubberMarkerHover = null;
let scrubberIcon = null;

let state = {
    isActive: false, // Is the mouse currently over the track?
    isDragging: false, // Is the mouse button down on the track?
    isVisible: false, // Is the scrubber UI (container + markers) visible?
    previewImages: [], // Array of preview image elements
    mainImages: [], // Array of main manga image elements in the viewer
    screenHeight: window.innerHeight,
    trackHeight: 0, // Height of the scrubber track element
    previewScrollHeight: 0, // Total scrollable height of the preview images
    activeMarkerHeight: 0,
    hoverMarkerHeight: 0,
    visibleImageIndex: 0, // Index of the image currently considered "active" in viewport center
    hoverImageIndex: 0, // Index corresponding to the current mouse position on the track
    hideTimeout: null,
    iconHideTimeout: null,
};

// --- Initialization and Teardown ---

// Called by ImageManager when a chapter's images are loaded and rendered
export function initScrubber() {
    // Ensure elements are cached
    scrubberParent = DOM.scrubberParent;
    scrubberContainer = DOM.scrubberContainer;
    scrubberTrack = DOM.scrubberTrack;
    scrubberPreview = DOM.scrubberPreview;
    scrubberMarkerActive = DOM.scrubberMarkerActive;
    scrubberMarkerHover = DOM.scrubberMarkerHover;
    scrubberIcon = DOM.scrubberIcon;

    if (!scrubberParent || !scrubberTrack || !scrubberPreview || !scrubberMarkerActive || !scrubberMarkerHover || !scrubberIcon) {
        console.error("Scrubber elements not found, cannot initialize.");
        return;
    }

    // Reset state
    state.previewImages = [];
    state.mainImages = $$('img.manga-image', DOM.imageContainer); // Get current main images
    state.screenHeight = window.innerHeight;
    state.trackHeight = scrubberTrack.offsetHeight;
    state.activeMarkerHeight = scrubberMarkerActive.offsetHeight;
    state.hoverMarkerHeight = scrubberMarkerHover.offsetHeight;
    state.visibleImageIndex = 0; // Reset to top
    state.hoverImageIndex = 0;
    state.isVisible = false;
    state.isActive = false;
    state.isDragging = false;
    clearTimeout(state.hideTimeout);
    clearTimeout(state.iconHideTimeout);

    // Clear previous preview images
    scrubberPreview.innerHTML = '';

    // Add event listeners
    addScrubberListeners();

    // Build preview images asynchronously
    buildPreviewImages();

    // Set initial active marker position
    updateActiveMarkerPosition();

    // Initially hide the scrubber UI, show the icon after a delay
    hideScrubberUI(true); // Force hide immediately
    showScrubberIconWithDelay();
}

// Called by ImageManager before loading a new chapter
export function teardownScrubber() {
    removeScrubberListeners();
    state.previewImages = [];
    state.mainImages = [];
    if (scrubberPreview) scrubberPreview.innerHTML = '';
    hideScrubberUI(true); // Hide immediately
    hideScrubberIcon(true);
    clearTimeout(state.hideTimeout);
    clearTimeout(state.iconHideTimeout);
}

// Placeholder function called by shortcuts
export function navigateScrubber(delta) {
    console.log(`Placeholder: Navigate Scrubber by ${delta}`);
    // TODO: Implement logic to change visibleImageIndex and scroll
    // const newIndex = state.visibleImageIndex + delta;
    // scrollToImage(newIndex);
}

async function buildPreviewImages() {
    if (!AppState.currentManga || !scrubberPreview) return;

    const { start, end } = getChapterBounds(AppState.currentManga, AppState.currentManga.currentChapter || 0);
    const fragment = document.createDocumentFragment();

    // Limit the number of preview images for performance if chapter is huge?
    // const maxPreviews = 100;
    // const count = Math.min(end - start, maxPreviews);
    const count = end - start;

    for (let i = 0; i < count; i++) {
        const imageIndex = start + i + 1; // 1-based index for loadImage
        try {
            const img = await loadImage(AppState.currentManga.imagesFullPath, imageIndex);
            if (img) {
                addClass(img, 'scrubber-preview-image block h-32 sm:h-40 md:h-48 w-auto rounded shadow-md border-2 border-transparent'); // Adjust height as needed
                img.loading = 'lazy';
                img.dataset.index = i; // Store 0-based index within chapter
                state.previewImages.push(img);
                fragment.appendChild(img);
            }
        } catch (error) {
            // Ignore errors, just skip the preview image
        }
    }

    scrubberPreview.appendChild(fragment);

    // Calculate total height of previews after they are potentially loaded/rendered
    // Use setTimeout to allow layout reflow
    setTimeout(() => {
        state.previewScrollHeight = scrubberPreview.scrollHeight;
    }, 100); // Adjust delay if needed
}

// --- Event Listeners ---

function addScrubberListeners() {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.addEventListener('mouseenter', handleMouseEnter);
    scrubberTrack.addEventListener('mouseleave', handleMouseLeave);
    scrubberTrack.addEventListener('mousemove', handleMouseMove);
    scrubberTrack.addEventListener('mousedown', handleMouseDown);
    // Add listeners to window for mouseup/mousemove during drag
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    // Icon interaction
    scrubberIcon.addEventListener('mouseenter', handleIconEnter);
    scrubberIcon.addEventListener('mouseleave', handleIconLeave);

    // Update screen height on resize
    window.addEventListener('resize', debouncedUpdateScreenHeight);
}

function removeScrubberListeners() {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.removeEventListener('mouseenter', handleMouseEnter);
    scrubberTrack.removeEventListener('mouseleave', handleMouseLeave);
    scrubberTrack.removeEventListener('mousemove', handleMouseMove);
    scrubberTrack.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
    scrubberIcon.removeEventListener('mouseenter', handleIconEnter);
    scrubberIcon.removeEventListener('mouseleave', handleIconLeave);
    window.removeEventListener('resize', debouncedUpdateScreenHeight);
}

// --- Event Handlers ---

function handleMouseEnter(event) {
    state.isActive = true;
    showScrubberUI();
    hideScrubberIcon();
    hideNav(); // Hide top nav when scrubber is active
}

function handleMouseLeave(event) {
    state.isActive = false;
    if (!state.isDragging) { // Don't hide if currently dragging
        hideScrubberUIWithDelay();
        showScrubberIconWithDelay();
    }
}

function handleMouseMove(event) {
    if (!state.isActive || state.isDragging) return; // Only update hover if not dragging
    updateHoverState(event.clientY);
}

function handleMouseDown(event) {
    if (event.button !== 0) return; // Only react to left mouse button
    state.isDragging = true;
    addClass(scrubberTrack, 'active:cursor-grabbing');
    updateHoverState(event.clientY); // Update position immediately on click
    scrollToImage(state.hoverImageIndex); // Scroll main view on click
    // Prevent text selection during drag
    event.preventDefault();
}

function handleWindowMouseMove(event) {
    if (!state.isDragging) return;
    updateHoverState(event.clientY);
    scrollToImage(state.hoverImageIndex, 'instant'); // Use instant scroll during drag for responsiveness
}

function handleWindowMouseUp(event) {
    if (event.button !== 0 || !state.isDragging) return;
    state.isDragging = false;
    removeClass(scrubberTrack, 'active:cursor-grabbing');
    // If mouse is no longer over the track after releasing, hide scrubber
    if (!state.isActive) {
        hideScrubberUIWithDelay();
        showScrubberIconWithDelay();
    }
}

function handleIconEnter() {
    showScrubberUI();
    hideScrubberIcon();
    hideNav();
}

function handleIconLeave() {
    // If not entering the main track area, hide UI again
    setTimeout(() => {
        if (!state.isActive) {
            hideScrubberUIWithDelay();
            showScrubberIconWithDelay();
        }
    }, 100);
}


// --- UI Updates ---

function showScrubberUI() {
    if (!state.isVisible && scrubberParent) {
        state.isVisible = true;
        removeClass(scrubberParent, 'opacity-0');
        // Show hover marker immediately when UI becomes visible
        removeClass(scrubberMarkerHover, 'opacity-0');
        clearTimeout(state.hideTimeout);
    }
}

function hideScrubberUI(force = false) {
    if ((state.isVisible || force) && scrubberParent) {
        state.isVisible = false;
        addClass(scrubberParent, 'opacity-0');
        // Hide hover marker when UI hides
        addClass(scrubberMarkerHover, 'opacity-0');
    }
}

function hideScrubberUIWithDelay() {
    clearTimeout(state.hideTimeout);
    state.hideTimeout = setTimeout(() => {
        // Only hide if mouse isn't over track and not dragging
        if (!state.isActive && !state.isDragging) {
            hideScrubberUI();
        }
    }, Config.SCRUBBER_HIDE_DELAY);
}

function showScrubberIcon() {
    if (scrubberIcon) removeClass(scrubberIcon, 'opacity-0');
}
function hideScrubberIcon(force = false) {
    if (scrubberIcon) addClass(scrubberIcon, 'opacity-0');
}

function showScrubberIconWithDelay() {
     clearTimeout(state.iconHideTimeout);
     state.iconHideTimeout = setTimeout(() => {
         // Only show if scrubber UI is hidden
         if (!state.isVisible) {
             showScrubberIcon();
         }
     }, Config.SCRUBBER_HIDE_DELAY / 2); // Show icon slightly faster
}

function updateHoverState(clientY) {
    // Use previewImages length for calculations related to hover index and preview display
    if (!state.isVisible || state.previewImages.length === 0) return;

    const ratio = Math.max(0, Math.min(1, clientY / state.screenHeight));
    // Calculate index based on ratio and the number of preview images
    const calculatedIndex = Math.floor(ratio * state.previewImages.length);
    // Ensure index stays within bounds [0, previewImages.length - 1]
    state.hoverImageIndex = Math.min(calculatedIndex, state.previewImages.length - 1);

    // Update hover marker position and text
    const hoverMarkerY = Math.max(0, Math.min(state.trackHeight - state.hoverMarkerHeight, clientY - state.hoverMarkerHeight / 2));
    scrubberMarkerHover.style.transform = `translateY(${hoverMarkerY}px)`;
    setText(scrubberMarkerHover, `${state.hoverImageIndex + 1}`);

    // Update preview scroll position
    // Scroll preview area to align the relevant part with the cursor
    if (state.previewScrollHeight > state.trackHeight && scrubberPreview) { // Only scroll if preview content is taller than track
        // Calculate the target scroll offset based on the cursor's ratio and the total preview height,
        // then adjust by the cursor's Y position to bring the relevant preview area near the cursor.
        const targetScroll = (ratio * state.previewScrollHeight) - clientY;
        // Apply the inverse transform to scroll the container
        scrubberPreview.style.transform = `translateY(${-targetScroll}px)`;
    } else if (scrubberPreview) {
        scrubberPreview.style.transform = 'translateY(0px)'; // No scroll needed
    }


    // Highlight preview image
    state.previewImages.forEach((img, index) => {
        // Ensure img exists before toggling class
        if (img) {
            toggleClass(img, 'border-blue-500', index === state.hoverImageIndex);
        }
    });
}

function updateActiveMarkerPosition() {
    // Active marker reflects the main view's position, based on mainImages.
    // If mainImages is empty or has 1, handle appropriately.
    if (!state.mainImages || state.mainImages.length <= 1) {
        scrubberMarkerActive.style.transform = 'translateY(0px)';
        // Display '1' or perhaps '-' if no images
        setText(scrubberMarkerActive, state.mainImages && state.mainImages.length > 0 ? '1' : '-');
        return;
    }
    // Calculate ratio based on the visible image index and the total number of main images
    const ratio = state.visibleImageIndex / (state.mainImages.length - 1);
    // Calculate marker position within the track height, accounting for marker height
    const activeMarkerY = ratio * (state.trackHeight - state.activeMarkerHeight);
    scrubberMarkerActive.style.transform = `translateY(${activeMarkerY}px)`;
    // Display the 1-based index of the currently visible main image
    setText(scrubberMarkerActive, `${state.visibleImageIndex + 1}`);
}

// --- Scrolling ---

function scrollToImage(imageIndex, behavior = 'smooth') {
    // Scrolling should target the main images based on the index derived from interaction.
    // Ensure the index is valid for the mainImages array.
    if (imageIndex >= 0 && state.mainImages && imageIndex < state.mainImages.length) {
        const targetImage = state.mainImages[imageIndex];
        if (targetImage) {
            targetImage.scrollIntoView({ behavior: behavior, block: 'start' });
            // Update active state immediately if scrolling instantly
            if (behavior === 'instant') {
                 updateScrubberState({ visibleImageIndex: imageIndex });
            }
        }
    }
}

// --- State Update ---

// Called by ImageManager's IntersectionObserver or instant scrolls
export function updateScrubberState(newState) {
    let changed = false;
    if (newState.hasOwnProperty('visibleImageIndex') && state.visibleImageIndex !== newState.visibleImageIndex) {
        state.visibleImageIndex = newState.visibleImageIndex;
        changed = true;
    }
    // Handle other state updates if needed

    if (changed) {
        updateActiveMarkerPosition();
    }
}

// --- Resize Handling ---
function updateScreenHeight() {
    state.screenHeight = window.innerHeight;
    state.trackHeight = scrubberTrack?.offsetHeight || 0;
    // Recalculate marker positions if needed
    updateActiveMarkerPosition();
}
const debouncedUpdateScreenHeight = debounce(updateScreenHeight, 100);


// --- Global Init ---
export function initScrubberManager() {
    // Add the icon using lucide
    if (DOM.scrubberIcon) {
        const iconElement = document.createElement('i');
        setAttribute(iconElement, 'data-lucide', 'chevrons-up-down');
        DOM.scrubberIcon.appendChild(iconElement);
        // Note: createIcons will be called in main.js to render this
    }
    console.log("Scrubber Manager Initialized.");
}