import { DOM, h, hideElement, showElement, toggleClass } from "@/core/dom-utils";
import { getMangaImages, scrollToView } from "@/core/utils";
import Config from "@/core/config";
import { LightboxState } from "@/state/state";
import { iconSvg } from "@/core/icons";

let lightboxElement: HTMLElement | null = null;
let lightboxImage: HTMLImageElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let longPressTimeout: ReturnType<typeof setTimeout> | undefined;

let currentImageList: HTMLImageElement[] = [];

// --- Core Functions ---

function createLightboxElement(): void {
    if (lightboxElement) return;

    lightboxElement = DOM.lightbox;
    if (!lightboxElement) return;

    lightboxElement.innerHTML = "";

    lightboxImage = h("img", {
        alt: "Lightbox Image",
        className:
            "max-w-[90vw] max-h-[90vh] object-contain cursor-grab active:cursor-grabbing border-4 border-black dark:border-white bg-white dark:bg-ink",
    });

    closeButton = h("button", {
        className:
            "btn-icon absolute top-8 right-8 !bg-accent !text-white brutal-border brutal-shadow rounded-none hover:-translate-y-1 hover:brutal-shadow-lg active:translate-y-0 active:shadow-none transition-all z-[80]",
        onclick: closeLightbox,
    });
    closeButton.append(iconSvg("X", { size: 32 }));

    prevButton = h("button", {
        className:
            "btn-icon absolute top-1/2 left-8 -translate-y-1/2 !bg-paper dark:!bg-ink !text-black dark:!text-white brutal-border brutal-shadow-lg-accent rounded-none hover:-translate-x-1 hover:brutal-shadow-xl-accent active:translate-x-0 active:shadow-none transition-all z-[80]",
        onclick: (event: MouseEvent) => {
            event.stopPropagation();
            navigateLightbox(-1);
        },
    });
    prevButton.append(iconSvg("ChevronLeft", { size: 40 }));

    nextButton = h("button", {
        className:
            "btn-icon absolute top-1/2 right-8 -translate-y-1/2 !bg-paper dark:!bg-ink !text-black dark:!text-white brutal-border brutal-shadow-lg-accent rounded-none hover:translate-x-1 hover:brutal-shadow-xl-accent active:translate-x-0 active:shadow-none transition-all z-[80]",
        onclick: (event: MouseEvent) => {
            event.stopPropagation();
            navigateLightbox(1);
        },
    });
    nextButton.append(iconSvg("ChevronRight", { size: 40 }));

    lightboxElement.append(lightboxImage);
    lightboxElement.append(closeButton);
    lightboxElement.append(prevButton);
    lightboxElement.append(nextButton);

    lightboxElement.addEventListener("click", handleBackdropClick);
    lightboxImage.addEventListener("mousedown", handlePanStart);
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
}

function openLightbox(targetImageElement: HTMLImageElement | null): void {
    if (!targetImageElement || LightboxState.isOpen) return;

    currentImageList = getMangaImages();
    const initialImageIndex = currentImageList.indexOf(targetImageElement);

    if (initialImageIndex === -1) {
        return;
    }

    createLightboxElement();
    if (!lightboxElement) return;

    LightboxState.update("isOpen", true);
    LightboxState.update("currentImageIndex", initialImageIndex);
    loadImageIntoLightbox(initialImageIndex);
    resetZoomAndPosition();

    showElement(lightboxElement, "flex");
    document.body.style.overflow = "hidden";

    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", handlePanEnd);

    updateButtonVisibility();
}

function closeLightbox(): void {
    if (!LightboxState.isOpen || !lightboxElement) return;

    LightboxState.update("isOpen", false);
    hideElement(lightboxElement);
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
        LightboxState.update("currentImageIndex", index);
    } else {
        console.warn(`Lightbox: Invalid index requested: ${index}`);
    }
    updateButtonVisibility();
}

export function navigateLightbox(direction: number): void {
    if (!LightboxState.isOpen || currentImageList.length === 0) return;

    const currentIndex = LightboxState.currentImageIndex;
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
    const currentIndex = LightboxState.currentImageIndex;

    toggleClass(prevButton, "invisible", currentIndex <= 0);
    toggleClass(nextButton, "invisible", currentIndex >= currentImageList.length - 1);
}

function resetZoomAndPosition(): void {
    if (!lightboxImage) return;
    lightboxImage.style.transition = "none";
    lightboxImage.style.transform = "translate(0px, 0px) scale(1)";
    LightboxState.update("currentScale", 1);
    LightboxState.update("currentTranslateX", 0);
    LightboxState.update("currentTranslateY", 0);
}

// --- Event Handlers ---

export function handleImageMouseDown(event: MouseEvent): void {
    LightboxState.update("isLongPress", false);
    clearTimeout(longPressTimeout);

    if (event.button !== 0) return;

    const targetImage = event.currentTarget as HTMLImageElement;

    longPressTimeout = setTimeout(() => {
        LightboxState.update("isLongPress", true);
        openLightbox(targetImage);
    }, Config.LIGHTBOX_LONG_PRESS_DURATION_MS);

    event.preventDefault();
}

export function handleImageMouseUp(): void {
    clearTimeout(longPressTimeout);
}

export function resetLongPressFlag(): void {
    LightboxState.update("isLongPress", false);
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
    LightboxState.update("isDragging", true);
    LightboxState.update("startX", event.clientX);
    LightboxState.update("startY", event.clientY);
    LightboxState.update("startTranslateX", LightboxState.currentTranslateX);
    LightboxState.update("startTranslateY", LightboxState.currentTranslateY);
}

function handlePanMove(event: MouseEvent): void {
    if (!LightboxState.isDragging) return;

    event.preventDefault();
    const dx = event.clientX - LightboxState.startX;
    const dy = event.clientY - LightboxState.startY;

    LightboxState.update("currentTranslateX", LightboxState.startTranslateX + dx);
    LightboxState.update("currentTranslateY", LightboxState.startTranslateY + dy);

    applyTransform();
}

function handlePanEnd(event: MouseEvent): void {
    if (event.button !== 0 || !LightboxState.isDragging) return;
    LightboxState.update("isDragging", false);
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
    const { currentScale } = LightboxState;
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

    const { currentTranslateX, currentTranslateY } = LightboxState;

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

    LightboxState.update("currentScale", newScale);
    LightboxState.update("currentTranslateX", finalTranslateX);
    LightboxState.update("currentTranslateY", finalTranslateY);

    applyTransform();
}

// --- Apply Transform ---
function applyTransform(): void {
    if (!lightboxImage) return;
    const { currentScale, currentTranslateX, currentTranslateY } = LightboxState;
    lightboxImage.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}
