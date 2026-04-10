import { createElement } from "lucide";

import Config from "../core/Config";
import { DOM, $$, addClass, showElement, hideElement, toggleClass } from "../core/DOMUtils";
import { AppIcons } from "../core/icons";
import { State } from "../core/State";
import { scrollToView } from "../core/Utils";

let lightboxElement = null;
let lightboxImage = null;
let prevButton = null;
let nextButton = null;
let closeButton = null;
let clickTimeout = null; // For long-press detection
export let isLongPress = false; // Flag to distinguish click from long-press

let currentImageList = [];

// --- Core Functions ---

function createLightboxElement() {
    if (lightboxElement) return;

    lightboxElement = DOM.lightbox;
    if (!lightboxElement) return;

    lightboxElement.innerHTML = "";

    lightboxImage = document.createElement("img");
    addClass(
        lightboxImage,
        "max-w-[90vw] max-h-[90vh] object-contain cursor-grab active:cursor-grabbing border-4 border-black dark:border-white bg-white dark:bg-[#0a0a0a]",
    );
    lightboxImage.alt = "Lightbox Image";

    closeButton = document.createElement("button");
    addClass(
        closeButton,
        "btn-icon absolute top-8 right-8 !bg-[#FF3366] !text-white border-2 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] rounded-none hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] active:translate-y-0 active:shadow-none transition-all z-[80]",
    );
    closeButton.appendChild(createElement(AppIcons.X, { width: 32, height: 32, "stroke-width": "3" }));
    closeButton.addEventListener("click", closeLightbox);

    prevButton = document.createElement("button");
    addClass(
        prevButton,
        "btn-icon absolute top-1/2 left-8 -translate-y-1/2 !bg-[#f4f4f0] dark:!bg-[#0a0a0a] !text-black dark:!text-white border-2 border-black dark:border-white shadow-[6px_6px_0_0_#FF3366] rounded-none hover:-translate-x-1 hover:shadow-[8px_8px_0_0_#FF3366] active:translate-x-0 active:shadow-none transition-all z-[80]",
    );
    prevButton.appendChild(createElement(AppIcons.ChevronLeft, { width: 40, height: 40, "stroke-width": "3" }));
    prevButton.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateLightbox(-1);
    });

    nextButton = document.createElement("button");
    addClass(
        nextButton,
        "btn-icon absolute top-1/2 right-8 -translate-y-1/2 !bg-[#f4f4f0] dark:!bg-[#0a0a0a] !text-black dark:!text-white border-2 border-black dark:border-white shadow-[6px_6px_0_0_#FF3366] rounded-none hover:translate-x-1 hover:shadow-[8px_8px_0_0_#FF3366] active:translate-x-0 active:shadow-none transition-all z-[80]",
    );
    nextButton.appendChild(createElement(AppIcons.ChevronRight, { width: 40, height: 40, "stroke-width": "3" }));
    nextButton.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateLightbox(1);
    });

    lightboxElement.appendChild(lightboxImage);
    lightboxElement.appendChild(closeButton);
    lightboxElement.appendChild(prevButton);
    lightboxElement.appendChild(nextButton);

    lightboxElement.addEventListener("click", handleBackdropClick);
    lightboxImage.addEventListener("mousedown", handlePanStart);
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
}

export function openLightbox(targetImageElement) {
    if (!targetImageElement || State.lightbox.isOpen) return;

    currentImageList = $$("img.manga-image", DOM.imageContainer);
    const initialImageIndex = currentImageList.indexOf(targetImageElement);

    if (initialImageIndex === -1) {
        // console.warn("Lightbox: Target image not found in main image list.");
        return;
    }

    createLightboxElement();
    if (!lightboxElement) return;

    State.update("lightbox.isOpen", true, false);
    State.update("lightbox.currentImageIndex", initialImageIndex, false);
    loadImageIntoLightbox(initialImageIndex);
    resetZoomAndPosition();

    showElement(lightboxElement, "flex");
    document.body.style.overflow = "hidden";

    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", handlePanEnd);

    updateButtonVisibility();
}

function closeLightbox() {
    if (!State.lightbox.isOpen || !lightboxElement) return;

    State.update("lightbox.isOpen", false, false);
    hideElement(lightboxElement);
    document.body.style.overflow = "";
    resetZoomAndPosition();
    currentImageList = [];

    window.removeEventListener("mousemove", handlePanMove);
    window.removeEventListener("mouseup", handlePanEnd);
}
function loadImageIntoLightbox(index) {
    if (!lightboxImage || !currentImageList.length) return;

    if (index >= 0 && index < currentImageList.length) {
        const targetImage = currentImageList[index];
        lightboxImage.src = targetImage.src;
        State.update("lightbox.currentImageIndex", index, false);
    } else {
        console.error(`Lightbox: Invalid index requested: ${index}`);
    }
    updateButtonVisibility();
}

export function navigateLightbox(direction) {
    if (!State.lightbox.isOpen || !currentImageList.length) return;

    const currentIndex = State.lightbox.currentImageIndex;
    let newIndex = currentIndex + direction;

    // Clamp index to the bounds of the cached list
    newIndex = Math.max(0, Math.min(newIndex, currentImageList.length - 1));

    if (newIndex !== currentIndex) {
        loadImageIntoLightbox(newIndex);
        resetZoomAndPosition();
        scrollToView(currentImageList[newIndex]);
    }
}

function updateButtonVisibility() {
    if (!prevButton || !nextButton || !currentImageList.length) return;
    const currentIndex = State.lightbox.currentImageIndex;

    toggleClass(prevButton, "invisible", currentIndex <= 0);
    toggleClass(nextButton, "invisible", currentIndex >= currentImageList.length - 1);
}

function resetZoomAndPosition() {
    if (!lightboxImage) return;
    lightboxImage.style.transition = "none";
    lightboxImage.style.transform = "translate(0px, 0px) scale(1)";
    State.update("lightbox.currentScale", 1, false);
    State.update("lightbox.currentTranslateX", 0, false);
    State.update("lightbox.currentTranslateY", 0, false);
}

// --- Event Handlers ---

export function handleImageMouseDown(event) {
    isLongPress = false;
    clearTimeout(clickTimeout);

    if (event.button !== 0) return;

    const targetImage = event.currentTarget;

    clickTimeout = setTimeout(() => {
        isLongPress = true;
        openLightbox(targetImage);
    }, Config.LIGHTBOX_LONG_PRESS_DURATION);

    event.preventDefault();
}

export function handleImageMouseUp() {
    clearTimeout(clickTimeout);
}

export function resetLongPressFlag() {
    isLongPress = false;
}

function handleBackdropClick(event) {
    if (event.target === lightboxElement) {
        closeLightbox();
    }
}

// --- Panning Logic ---
function handlePanStart(event) {
    if (event.button !== 0) return;

    event.preventDefault();
    State.update("lightbox.isDragging", true, false);
    State.update("lightbox.startX", event.clientX, false);
    State.update("lightbox.startY", event.clientY, false);
    State.update("lightbox.startTranslateX", State.lightbox.currentTranslateX, false);
    State.update("lightbox.startTranslateY", State.lightbox.currentTranslateY, false);
}

function handlePanMove(event) {
    if (!State.lightbox.isDragging) return;

    event.preventDefault();
    const dx = event.clientX - State.lightbox.startX;
    const dy = event.clientY - State.lightbox.startY;

    State.update("lightbox.currentTranslateX", State.lightbox.startTranslateX + dx, false);
    State.update("lightbox.currentTranslateY", State.lightbox.startTranslateY + dy, false);

    applyTransform();
}

function handlePanEnd(event) {
    if (event.button !== 0 || !State.lightbox.isDragging) return;
    State.update("lightbox.isDragging", false, false);
}

// --- Zoom Logic ---
function handleZoom(event) {
    event.preventDefault();
    if (!lightboxImage) return;

    const rect = lightboxImage.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const originX = mouseX - rect.width / 2;
    const originY = mouseY - rect.height / 2;

    const isZoomingOut = event.deltaY > 0;
    const scaleFactor = isZoomingOut ? 1 / 1.25 : 1.25;
    const currentScale = State.lightbox.currentScale;
    let newScale = currentScale * scaleFactor;

    // Clamp scale
    const minScale = 1;
    const maxScale = Config.MAX_ZOOM_LIGHTBOX;
    if (newScale < minScale) {
        if (currentScale === minScale) return;
        newScale = minScale;
    } else if (newScale > maxScale) {
        if (currentScale === maxScale) return;
        newScale = maxScale;
    }

    const actualScaleFactor = newScale / currentScale;

    let currentTranslateX = State.lightbox.currentTranslateX;
    let currentTranslateY = State.lightbox.currentTranslateY;

    let finalTranslateX = currentTranslateX - originX * (actualScaleFactor - 1);
    let finalTranslateY = currentTranslateY - originY * (actualScaleFactor - 1);

    // --- Centering Logic on Zoom Out ---
    const centeringThreshold = 1.5;
    const targetCenterX = 0;
    const targetCenterY = 0;

    if (isZoomingOut && newScale < centeringThreshold && currentScale > minScale) {
        // Interpolate towards center (0,0) as scale approaches minScale
        const centeringProgress = (centeringThreshold - newScale) / (centeringThreshold - minScale);
        finalTranslateX = finalTranslateX * (1 - centeringProgress) + targetCenterX * centeringProgress;
        finalTranslateY = finalTranslateY * (1 - centeringProgress) + targetCenterY * centeringProgress;
    }

    if (newScale === minScale) {
        // Force center alignment if scale reaches minimum
        finalTranslateX = targetCenterX;
        finalTranslateY = targetCenterY;
    }

    State.update("lightbox.currentScale", newScale, false);
    State.update("lightbox.currentTranslateX", finalTranslateX, false);
    State.update("lightbox.currentTranslateY", finalTranslateY, false);

    applyTransform();
}

// --- Apply Transform ---
function applyTransform() {
    if (!lightboxImage) return;
    const { currentTranslateX, currentTranslateY, currentScale } = State.lightbox;
    lightboxImage.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}
