import { DOM, h, setVisible, toggleClass } from "@/core/dom-utils";
import { getMangaImages, scrollToView } from "@/core/utils";
import Config from "@/core/config";
import { iconSvg } from "@/core/icons";

let lightboxElement: HTMLElement | null = null;
let lightboxImage: HTMLImageElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let longPressTimeout: ReturnType<typeof setTimeout> | undefined;

let currentImageList: HTMLImageElement[] = [];

let isOpen = false;
let isLongPress = false;
let currentImageIndex = -1;
let currentScale = 1;
let currentTranslateX = 0;
let currentTranslateY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;
let startTranslateX = 0;
let startTranslateY = 0;

export function isLightboxOpen(): boolean {
    return isOpen;
}

export function isLightboxLongPress(): boolean {
    return isLongPress;
}

// --- Core Functions ---

function createLightboxElement(): void {
    if (lightboxElement) return;

    lightboxElement = DOM.lightbox;
    if (!lightboxElement) return;

    lightboxElement.innerHTML = "";

    lightboxImage = h("img", {
        alt: "Lightbox Image",
        className: "max-w-[90vw] max-h-[90vh] object-contain cursor-grab active:cursor-grabbing shadow-soft",
    });

    const lightboxIconBtnClasses =
        "absolute flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all duration-150 z-[80] cursor-pointer";

    closeButton = h("button", {
        className: `${lightboxIconBtnClasses} top-6 right-6`,
        onclick: closeLightbox,
        title: "Close",
    });
    closeButton.append(iconSvg("X", { size: 18, strokeWidth: 2 }));

    prevButton = h("button", {
        className: `${lightboxIconBtnClasses} top-1/2 left-6 -translate-y-1/2`,
        onclick: (event: MouseEvent) => {
            event.stopPropagation();
            navigateLightbox(-1);
        },
        title: "Previous image",
    });
    prevButton.append(iconSvg("ChevronLeft", { size: 18, strokeWidth: 2 }));

    nextButton = h("button", {
        className: `${lightboxIconBtnClasses} top-1/2 right-6 -translate-y-1/2`,
        onclick: (event: MouseEvent) => {
            event.stopPropagation();
            navigateLightbox(1);
        },
        title: "Next image",
    });
    nextButton.append(iconSvg("ChevronRight", { size: 18, strokeWidth: 2 }));

    lightboxElement.append(lightboxImage, closeButton, prevButton, nextButton);

    lightboxElement.addEventListener("click", handleBackdropClick);
    lightboxImage.addEventListener("mousedown", handlePanStart);
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
}

function openLightbox(targetImageElement: HTMLImageElement | null): void {
    if (!targetImageElement || isOpen) return;

    currentImageList = getMangaImages();
    const initialImageIndex = currentImageList.indexOf(targetImageElement);

    if (initialImageIndex === -1) {
        return;
    }

    createLightboxElement();
    if (!lightboxElement) return;

    isOpen = true;
    currentImageIndex = initialImageIndex;
    loadImageIntoLightbox(initialImageIndex);
    resetZoomAndPosition();

    setVisible(lightboxElement, true, "flex");
    document.body.style.overflow = "hidden";

    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", handlePanEnd);

    updateButtonVisibility();
}

function closeLightbox(): void {
    if (!isOpen || !lightboxElement) return;

    isOpen = false;
    setVisible(lightboxElement, false);
    document.body.style.overflow = "";
    resetZoomAndPosition();
    currentImageList = [];

    window.removeEventListener("mousemove", handlePanMove);
    window.removeEventListener("mouseup", handlePanEnd);
}

function loadImageIntoLightbox(index: number): void {
    if (!lightboxImage || currentImageList.length === 0) return;

    const targetImage = currentImageList[index];
    if (targetImage) {
        lightboxImage.src = targetImage.src;
        currentImageIndex = index;
    } else {
        console.warn(`Lightbox: Invalid index requested: ${index}`);
    }
    updateButtonVisibility();
}

export function navigateLightbox(direction: number): void {
    if (!isOpen || currentImageList.length === 0) return;

    const currentIndex = currentImageIndex;
    let newIndex = currentIndex + direction;

    // Clamp index to the bounds of the cached list
    newIndex = Math.max(0, Math.min(newIndex, currentImageList.length - 1));

    const targetImage = currentImageList[newIndex];
    if (newIndex !== currentIndex && targetImage) {
        loadImageIntoLightbox(newIndex);
        resetZoomAndPosition();
        scrollToView(targetImage);
    }
}

function updateButtonVisibility(): void {
    if (!prevButton || !nextButton || currentImageList.length === 0) return;

    toggleClass(prevButton, "invisible", currentImageIndex <= 0);
    toggleClass(nextButton, "invisible", currentImageIndex >= currentImageList.length - 1);
}

function resetZoomAndPosition(): void {
    if (!lightboxImage) return;
    lightboxImage.style.transition = "none";
    lightboxImage.style.transform = "translate(0px, 0px) scale(1)";
    currentScale = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;
}

// --- Event Handlers ---

export function handleImageMouseDown(event: MouseEvent): void {
    isLongPress = false;
    clearTimeout(longPressTimeout);

    if (event.button !== 0) return;

    const targetImage = event.currentTarget as HTMLImageElement;

    longPressTimeout = setTimeout(() => {
        isLongPress = true;
        openLightbox(targetImage);
    }, Config.LIGHTBOX_LONG_PRESS_DURATION_MS);

    event.preventDefault();
}

export function handleImageMouseUp(): void {
    clearTimeout(longPressTimeout);
}

export function resetLongPressFlag(): void {
    isLongPress = false;
}

function handleBackdropClick(event: MouseEvent): void {
    if (event.target === lightboxElement) {
        closeLightbox();
    }
}

// --- Panning Logic ---
function handlePanStart(event: MouseEvent): void {
    if (event.button !== 0) return;

    event.preventDefault();
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    startTranslateX = currentTranslateX;
    startTranslateY = currentTranslateY;
}

function handlePanMove(event: MouseEvent): void {
    if (!isDragging) return;

    event.preventDefault();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    currentTranslateX = startTranslateX + dx;
    currentTranslateY = startTranslateY + dy;

    applyTransform();
}

function handlePanEnd(event: MouseEvent): void {
    if (event.button !== 0 || !isDragging) return;
    isDragging = false;
}

// --- Zoom Logic ---
function handleZoom(event: WheelEvent): void {
    event.preventDefault();
    if (!lightboxImage) return;

    const rect = lightboxImage.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const originX = mouseX - rect.width / 2;
    const originY = mouseY - rect.height / 2;

    const isZoomingOut = event.deltaY > 0;
    const scaleFactor = isZoomingOut ? 1 / 1.25 : 1.25;
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

    currentScale = newScale;
    currentTranslateX = finalTranslateX;
    currentTranslateY = finalTranslateY;

    applyTransform();
}

// --- Apply Transform ---
function applyTransform(): void {
    if (!lightboxImage) return;
    lightboxImage.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}
