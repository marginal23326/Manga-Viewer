import { DOM, $$, addClass, toggleClass, setText, setAttribute } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";
import { State } from "../core/State";
import { debounce, getChapterBounds, scrollToView } from "../core/Utils";

import { hideNav } from "./NavigationManager"; // To hide nav when scrubber is active

let scrubberParent = null;
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
    currentChapterIndex: -1,
    visibleImageIndex: 0,
    hoverImageIndex: 0,
};

// --- Initialization and Teardown ---

// Called by ImageManager when a chapter's images are loaded and rendered
export function initScrubber(chapterIndex) {
    // Ensure elements are cached
    scrubberParent = DOM.scrubberParent;
    scrubberTrack = DOM.scrubberTrack;
    scrubberPreview = DOM.scrubberPreview;
    scrubberMarkerActive = DOM.scrubberMarkerActive;
    scrubberMarkerHover = DOM.scrubberMarkerHover;
    scrubberIcon = DOM.scrubberIcon;

    if (
        !scrubberParent ||
        !scrubberTrack ||
        !scrubberPreview ||
        !scrubberMarkerActive ||
        !scrubberMarkerHover ||
        !scrubberIcon
    ) {
        console.error("Scrubber elements not found, cannot initialize.");
        return;
    }

    // Reset state
    state.previewImages = [];
    state.mainImages = $$("img.manga-image", DOM.imageContainer); // Get current main images
    state.currentChapterIndex = chapterIndex;
    state.screenHeight = window.innerHeight;
    state.trackHeight = scrubberTrack.offsetHeight;
    state.activeMarkerHeight = scrubberMarkerActive.offsetHeight;
    state.hoverMarkerHeight = scrubberMarkerHover.offsetHeight;
    state.visibleImageIndex = 0; // Reset to top
    state.hoverImageIndex = 0;
    state.isVisible = false;
    state.isActive = false;
    state.isDragging = false;

    // Clear previous preview images
    scrubberPreview.innerHTML = "";

    // Add event listeners
    addScrubberListeners();

    // Build preview images asynchronously
    buildPreviewImages(chapterIndex);

    // Set initial active marker position
    updateActiveMarkerPosition();

    // Initially hide the scrubber UI
    hideScrubberUI(true); // Force hide immediately
}

// Called by ImageManager before loading a new chapter
export function teardownScrubber() {
    removeScrubberListeners();
    state.previewImages = [];
    state.mainImages = [];
    if (scrubberPreview) scrubberPreview.innerHTML = "";
    hideScrubberUI(true); // Hide immediately
}

async function buildPreviewImages(chapterIndex) {
    if (!State.currentManga || !scrubberPreview || chapterIndex < 0) return;

    const { start, end } = getChapterBounds(State.currentManga, chapterIndex);
    const fragment = document.createDocumentFragment();

    // Limit the number of preview images for performance if chapter is huge?
    // const maxPreviews = 100;
    // const count = Math.min(end - start, maxPreviews);
    const count = end - start;

    for (let i = 0; i < count; i++) {
        const imageIndex = start + i + 1; // 1-based index for loadImage
        try {
            const img = await loadImage(State.currentManga.imagesFullPath, imageIndex);
            if (img) {
                addClass(img, "scrubber-preview-image block h-32 sm:h-40 md:h-48 w-auto rounded");
                img.loading = "lazy";
                img.dataset.index = i; // Store 0-based index within chapter
                state.previewImages.push(img);
                fragment.appendChild(img);
            }
        } catch {
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
    scrubberTrack.addEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.addEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.addEventListener("mousemove", handleMouseMove);
    scrubberTrack.addEventListener("mousedown", handleMouseDown);
    // Add listeners to window for mouseup/mousemove during drag
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    // Update screen height on resize
    window.addEventListener("resize", debouncedUpdateScreenHeight);
}

function removeScrubberListeners() {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.removeEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.removeEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.removeEventListener("mousemove", handleMouseMove);
    scrubberTrack.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
    window.removeEventListener("resize", debouncedUpdateScreenHeight);
}

// --- Event Handlers ---

function handleMouseEnter() {
    state.isActive = true;
    showScrubberUI();
    hideNav(); // Hide top nav when scrubber is active
}

function handleMouseLeave() {
    state.isActive = false;
    if (!state.isDragging) {
        // Don't hide if currently dragging
        hideScrubberUI();
    }
}

function handleMouseMove(event) {
    if (!state.isActive || state.isDragging) return; // Only update hover if not dragging
    updateHoverState(event.clientY);
}

function handleMouseDown(event) {
    if (event.button !== 0) return; // Only react to left mouse button
    state.isDragging = true;
    toggleClass(scrubberTrack, "active:cursor-grabbing", true);
    updateHoverState(event.clientY); // Update position immediately on click
    if (state.mainImages[state.hoverImageIndex]) {
        scrollToView(state.mainImages[state.hoverImageIndex]); // Scroll main view on click
    }
    // Prevent text selection during drag
    event.preventDefault();
}

function handleWindowMouseMove(event) {
    if (!state.isDragging) return;
    updateHoverState(event.clientY);
    if (state.mainImages[state.hoverImageIndex]) {
        scrollToView(state.mainImages[state.hoverImageIndex], 'instant'); // Instant scroll on drag.
        updateScrubberState({ visibleImageIndex: state.hoverImageIndex });
    }
}

function handleWindowMouseUp(event) {
    if (event.button !== 0 || !state.isDragging) return;
    state.isDragging = false;
    toggleClass(scrubberTrack, "active:cursor-grabbing", false);
    // If mouse is no longer over the track after releasing, hide scrubber
    if (!state.isActive) {
        hideScrubberUI();
    }
}

// --- UI Updates ---

function showScrubberUI() {
    if (!state.isVisible && scrubberParent) {
        state.isVisible = true;
        toggleClass(scrubberParent, "opacity-0", false);
        // Show hover marker immediately when UI becomes visible
        toggleClass(scrubberMarkerHover, "opacity-0", false);
    }
}

function hideScrubberUI(force = false) {
    if ((state.isVisible || force) && scrubberParent) {
        state.isVisible = false;
        toggleClass(scrubberParent, "opacity-0", true);
        // Hide hover marker when UI hides
        toggleClass(scrubberMarkerHover, "opacity-0", true);
    }
}

function updateHoverState(clientY) {
    // Use previewImages length for calculations related to hover index and preview display
    if (!state.isVisible || state.previewImages.length === 0) return;

    const margin = 16; // px
    const ratio = Math.max(0, Math.min(1, 
        (clientY - margin) / (window.innerHeight - 2 * margin)
    ));
    // Calculate index based on ratio and the number of preview images
    const calculatedIndex = Math.floor(ratio * state.previewImages.length);
    // Ensure index stays within bounds [0, previewImages.length - 1]
    state.hoverImageIndex = Math.min(calculatedIndex, state.previewImages.length - 1);

    // Update hover marker position and text
    const hoverMarkerY = ratio * state.trackHeight - state.hoverMarkerHeight / 2;
    scrubberMarkerHover.style.transform = `translateY(${Math.max(0, Math.min(state.trackHeight - state.hoverMarkerHeight, hoverMarkerY))}px)`;
    setText(scrubberMarkerHover, `${state.hoverImageIndex + 1}`);

    // Update preview scroll position
    // Scroll preview area to align the relevant part with the cursor
    if (state.previewScrollHeight > state.trackHeight && scrubberPreview) {
        // Only scroll if preview content is taller than track
        // Calculate the target scroll offset based on the cursor's ratio and the total preview height,
        // then adjust by the cursor's Y position to bring the relevant preview area near the cursor.
        const targetScroll = ratio * state.previewScrollHeight - clientY;
        // Apply the inverse transform to scroll the container
        scrubberPreview.style.transform = `translateY(${-targetScroll}px)`;
    } else if (scrubberPreview) {
        scrubberPreview.style.transform = "translateY(0px)"; // No scroll needed
    }

    // Highlight preview image
    state.previewImages.forEach((img, index) => {
        if (!img) return;
        toggleClass(
            img,
            "drop-shadow-[0_0_10px_rgba(0,0,0,0.75)] dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.75)]",
            index === state.hoverImageIndex,
        );
    });
}

function updateActiveMarkerPosition() {
    if (!state.mainImages || state.mainImages.length <= 1) {
        scrubberMarkerActive.style.transform = "translateY(0px)";
        setText(scrubberMarkerActive, state.mainImages?.length > 0 ? "1" : "-");
        return;
    }

    // Find the visual index (position) of the currently visible image
    const visualIndex = Math.max(
        0,
        Array.from(state.mainImages).findIndex((img) => parseInt(img.dataset.index, 10) === state.visibleImageIndex),
    );

    // Calculate position and update UI
    const ratio = (visualIndex + 0.5) / state.previewImages.length;
    const activeMarkerY = ratio * state.trackHeight - state.activeMarkerHeight / 2;
    scrubberMarkerActive.style.transform = `translateY(${Math.max(0, Math.min(state.trackHeight - state.activeMarkerHeight, activeMarkerY))}px)`;
    setText(scrubberMarkerActive, `${visualIndex + 1}`);
}

// --- State Update ---

// Called by ImageManager's IntersectionObserver or instant scrolls
export function updateScrubberState(newState) {
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(newState, "visibleImageIndex") && state.visibleImageIndex !== newState.visibleImageIndex) {
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
        const iconElement = document.createElement("i");
        setAttribute(iconElement, { "data-lucide": "chevrons-up-down" });
        DOM.scrubberIcon.appendChild(iconElement);
    }
}
