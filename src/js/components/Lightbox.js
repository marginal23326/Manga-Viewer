import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { DOM, $$, addClass, showElement, hideElement, toggleClass } from '../core/DOMUtils';
import { AppIcons } from '../core/icons';
import { createElement } from 'lucide';

let lightboxElement = null;
let lightboxImage = null;
let prevButton = null;
let nextButton = null;
let closeButton = null;
let clickTimeout = null; // For long-press detection
export let isLongPress = false; // Flag to distinguish click from long-press

// --- Core Functions ---

function createLightboxElement() {
    if (lightboxElement) return; // Already created

    lightboxElement = DOM.lightbox; // Get from cached DOM elements
    if (!lightboxElement) {
        console.error("Lightbox container element not found in DOM!");
        return;
    }

    // Clear any previous content
    lightboxElement.innerHTML = '';

    // Image element
    lightboxImage = document.createElement('img');
    addClass(lightboxImage, 'max-w-[95vw] max-h-[95vh] object-contain cursor-grab active:cursor-grabbing transition-transform duration-100 ease-out'); // Basic styles
    lightboxImage.alt = "Lightbox Image";

    // Close Button
    closeButton = document.createElement('button');
    addClass(closeButton, 'btn-icon absolute top-4 right-4 text-white bg-black/40 hover:bg-black/70');
    closeButton.appendChild(createElement(AppIcons.X, { size: 28 })); // Use createElement
    closeButton.addEventListener('click', closeLightbox);

    // Prev Button
    prevButton = document.createElement('button');
    addClass(prevButton, 'btn-icon absolute top-1/2 left-4 transform -translate-y-1/2 text-white bg-black/40 hover:bg-black/70');
    prevButton.appendChild(createElement(AppIcons.ChevronLeft, { size: 32 }));
    prevButton.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(-1); });

    // Next Button
    nextButton = document.createElement('button');
    addClass(nextButton, 'btn-icon absolute top-1/2 right-4 transform -translate-y-1/2 text-white bg-black/40 hover:bg-black/70');
    nextButton.appendChild(createElement(AppIcons.ChevronRight, { size: 32 }));
    nextButton.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox(1); });

    // Append elements
    lightboxElement.appendChild(lightboxImage);
    lightboxElement.appendChild(closeButton);
    lightboxElement.appendChild(prevButton);
    lightboxElement.appendChild(nextButton);

    // Add event listeners for pan, zoom, close on backdrop click
    lightboxElement.addEventListener('click', handleBackdropClick);
    lightboxImage.addEventListener('mousedown', handlePanStart);
    lightboxImage.addEventListener('wheel', handleZoom, { passive: false }); // Prevent page scroll while zooming image

    // Add window listeners for mouse move/up during pan
    window.addEventListener('mousemove', handlePanMove);
    window.addEventListener('mouseup', handlePanEnd);
}

export function openLightbox(targetImageElement) {
    if (!targetImageElement || AppState.lightbox.isOpen) return;

    const mainImages = $$('img.manga-image', DOM.imageContainer);
    const imageIndex = mainImages.indexOf(targetImageElement);

    if (imageIndex === -1) {
        console.warn("Target image not found in main image list.");
        return;
    }

    // Ensure lightbox structure exists
    createLightboxElement();
    if (!lightboxElement) return;

    AppState.update('lightbox.isOpen', true, false);
    AppState.update('lightbox.currentImageIndex', imageIndex, false);

    loadImageIntoLightbox(imageIndex);
    resetZoomAndPosition(); // Reset transform before showing

    // Show lightbox
    showElement(lightboxElement, 'flex'); // Use flex for centering
    document.body.style.overflow = 'hidden'; // Prevent body scroll

    updateButtonVisibility();
}

function closeLightbox() {
    if (!AppState.lightbox.isOpen || !lightboxElement) return;

    AppState.update('lightbox.isOpen', false, false);
    hideElement(lightboxElement);
    document.body.style.overflow = ''; // Restore body scroll
    resetZoomAndPosition(); // Clean up transform state
}

function loadImageIntoLightbox(index) {
    if (!lightboxImage) return;

    const mainImages = $$('img.manga-image', DOM.imageContainer);
    if (index >= 0 && index < mainImages.length) {
        const targetImage = mainImages[index];
        // Check if the main image is actually loaded (might be lazy-loaded)
        if (targetImage.complete && targetImage.naturalHeight !== 0) {
            lightboxImage.src = targetImage.src;
            AppState.update('lightbox.currentImageIndex', index, false);
        } else {
            // If main image isn't ready, show placeholder or skip?
            // For now, let's just show a placeholder or the potentially broken src
            lightboxImage.src = targetImage.src; // Might show broken image icon
            console.warn(`Lightbox: Main image ${index} not fully loaded.`);
            AppState.update('lightbox.currentImageIndex', index, false);
            // Or try loading the next valid one? This could get complex.
        }
    } else {
        console.error(`Invalid index for loadImageIntoLightbox: ${index}`);
        // Optionally close lightbox or show error state
        closeLightbox();
    }
}

function navigateLightbox(direction) {
    if (!AppState.lightbox.isOpen) return;

    const mainImages = $$('img.manga-image', DOM.imageContainer);
    let newIndex = AppState.lightbox.currentImageIndex + direction;

    // Clamp index
    newIndex = Math.max(0, Math.min(newIndex, mainImages.length - 1));

    if (newIndex !== AppState.lightbox.currentImageIndex) {
        loadImageIntoLightbox(newIndex);
        resetZoomAndPosition();
        updateButtonVisibility();
    }
}

function updateButtonVisibility() {
    if (!prevButton || !nextButton) return;
    const mainImages = $$('img.manga-image', DOM.imageContainer);
    const currentIndex = AppState.lightbox.currentImageIndex;

    toggleClass(prevButton, 'invisible', currentIndex <= 0);
    toggleClass(nextButton, 'invisible', currentIndex >= mainImages.length - 1);
}

function resetZoomAndPosition() {
    if (!lightboxImage) return;
    // Ensure transform is applied immediately
    lightboxImage.style.transition = 'none'; // Disable transitions during reset
    lightboxImage.style.transform = 'translate(0px, 0px) scale(1)';
    AppState.update('lightbox.currentScale', 1, false);
    AppState.update('lightbox.currentTranslateX', 0, false);
    AppState.update('lightbox.currentTranslateY', 0, false);
    // Re-enable transitions shortly after if needed, or rely on class-based transitions
    requestAnimationFrame(() => {
        lightboxImage.style.transition = ''; // Re-enable transitions defined in CSS
    });
}

// --- Event Handlers ---

// Called by ImageManager on main image elements
export function handleImageMouseDown(event) {
    // Use a timeout to detect long press vs click
    isLongPress = false; // Reset flag
    clearTimeout(clickTimeout); // Clear previous timeout

    // Only trigger on left click
    if (event.button !== 0) return;

    const targetImage = event.currentTarget; // The image element the listener is on

    clickTimeout = setTimeout(() => {
        isLongPress = true;
        openLightbox(targetImage);
    }, Config.LIGHTBOX_LONG_PRESS_DURATION);

    // Prevent default image drag behavior
    event.preventDefault();
}

export function handleImageMouseUp(event) {
    // Clear the long-press timeout if mouse is released quickly
    clearTimeout(clickTimeout);
}

// Function to allow resetting the flag from outside
export function resetLongPressFlag() {
    isLongPress = false;
}

// Handle clicks on the backdrop to close
function handleBackdropClick(event) {
    if (event.target === lightboxElement) { // Only close if backdrop itself is clicked
        closeLightbox();
    }
}

// --- Panning Logic ---
function handlePanStart(event) {
    // Only pan with left mouse button if scale > 1
    if (event.button !== 0 || AppState.lightbox.currentScale <= 1) return;

    event.preventDefault(); // Prevent default drag
    AppState.update('lightbox.isDragging', true, false);
    AppState.update('lightbox.startX', event.clientX, false);
    AppState.update('lightbox.startY', event.clientY, false);
    AppState.update('lightbox.startTranslateX', AppState.lightbox.currentTranslateX, false);
    AppState.update('lightbox.startTranslateY', AppState.lightbox.currentTranslateY, false);
    // cursor-grab/grabbing classes are handled by Tailwind on the image element
}

function handlePanMove(event) {
    if (!AppState.lightbox.isDragging) return;

    event.preventDefault();
    const dx = event.clientX - AppState.lightbox.startX;
    const dy = event.clientY - AppState.lightbox.startY;

    AppState.update('lightbox.currentTranslateX', AppState.lightbox.startTranslateX + dx, false);
    AppState.update('lightbox.currentTranslateY', AppState.lightbox.startTranslateY + dy, false);

    applyTransform();
}

function handlePanEnd(event) {
    if (event.button !== 0 || !AppState.lightbox.isDragging) return;
    AppState.update('lightbox.isDragging', false, false);
}

// --- Zoom Logic ---
function handleZoom(event) {
    event.preventDefault();
    if (!lightboxImage) return;

    const rect = lightboxImage.getBoundingClientRect();
    // Mouse position relative to the image's bounding box
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Ensure mouse is over the image bounds (important!)
    if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) {
        // Allow zooming out even if cursor is slightly outside when scaled up?
        // For now, strict bounds check.
        // console.log("Zoom ignored: Mouse outside image bounds");
        return;
    }

    const isZoomingOut = event.deltaY > 0;
    // Use factors similar to original code for feel
    const scaleFactor = isZoomingOut ? 0.8 : 1.25; // Adjust factors as needed
    let newScale = AppState.lightbox.currentScale * scaleFactor;

    // Clamp scale
    const minScale = 1;
    if (newScale < minScale) {
        // If already at min scale and zooming out, reset position fully
        if (AppState.lightbox.currentScale === minScale) {
            resetZoomAndPosition();
            return;
        }
        newScale = minScale; // Snap to min scale
    } else if (newScale > Config.MAX_ZOOM_LIGHTBOX) {
        newScale = Config.MAX_ZOOM_LIGHTBOX; // Clamp to max scale
        if (AppState.lightbox.currentScale === newScale) return; // Already at max
    }

    // --- Calculate Offset based on Original Logic ---
    let offsetX, offsetY;
    const centeringThreshold = 2.0; // Threshold below which we start recentering (adjust as needed)
    const actualScaleFactor = newScale / AppState.lightbox.currentScale; // More precise factor

    if (isZoomingOut && newScale < centeringThreshold && AppState.lightbox.currentScale > minScale) {
        // Calculate progress towards fully centered (scale = 1)
        // Use a power curve for smoother transition
        const centeringProgress = Math.pow((centeringThreshold - newScale) / (centeringThreshold - minScale), 1.5); // Adjust power (e.g., 1.5, 2)

        // Target is center (translateX=0, translateY=0)
        const targetCenterX = 0;
        const targetCenterY = 0;

        // Calculate offset based purely on cursor position
        const cursorOffsetX = (mouseX - rect.width / 2) * (actualScaleFactor - 1);
        const cursorOffsetY = (mouseY - rect.height / 2) * (actualScaleFactor - 1);

        // Calculate offset needed to move towards the target center
        // Offset needed = currentPos - targetPos * scaleFactor (doesn't seem right)
        // Let's try interpolating the translation
        const interpolatedTranslateX = AppState.lightbox.currentTranslateX * (1 - centeringProgress) + targetCenterX * centeringProgress;
        const interpolatedTranslateY = AppState.lightbox.currentTranslateY * (1 - centeringProgress) + targetCenterY * centeringProgress;

        // Calculate the difference needed to reach the interpolated position *after* cursor-based zoom offset
        const currentTranslateXAfterCursorZoom = AppState.lightbox.currentTranslateX - cursorOffsetX;
        const currentTranslateYAfterCursorZoom = AppState.lightbox.currentTranslateY - cursorOffsetY;

        offsetX = currentTranslateXAfterCursorZoom - interpolatedTranslateX;
        offsetY = currentTranslateYAfterCursorZoom - interpolatedTranslateY;

    } else {
        // Standard zoom towards cursor when zooming in or above threshold
        offsetX = (mouseX - rect.width / 2) * (actualScaleFactor - 1);
        offsetY = (mouseY - rect.height / 2) * (actualScaleFactor - 1);
    }

    // Update state
    const finalTranslateX = AppState.lightbox.currentTranslateX - offsetX;
    const finalTranslateY = AppState.lightbox.currentTranslateY - offsetY;

    AppState.update('lightbox.currentScale', newScale, false);
    AppState.update('lightbox.currentTranslateX', finalTranslateX, false);
    AppState.update('lightbox.currentTranslateY', finalTranslateY, false);

    // Apply the transform
    applyTransform();
}

// --- Apply Transform ---
function applyTransform() {
    if (!lightboxImage) return;
    const { currentTranslateX, currentTranslateY, currentScale } = AppState.lightbox;
    lightboxImage.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}