import { DOM, bodyScroll, h, setVisible, toggleClass } from "@/core/dom-utils";
import { clamp, createGenerationGuard, renewController } from "@/core/utils";
import type { ChapterContext } from "./chapter";
import Config from "@/core/config";
import { iconSvg } from "@/core/icons";
import { loadImage } from "./image-loader";

export interface LightboxContext extends ChapterContext {
    onNavigate?: (localIndex: number) => void;
}

let lightboxElement: HTMLElement | null = null;
let lightboxImage: HTMLImageElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;
let closeButton: HTMLButtonElement | null = null;
let longPressTimeout: ReturnType<typeof setTimeout> | undefined;

let lightboxContext: LightboxContext | null = null;

let isOpen = false;
let isLongPress = false;
let panController = new AbortController();
let currentImageIndex = -1;
const loadGuard = createGenerationGuard();
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

export function setLightboxContext(context: LightboxContext | null): void {
    lightboxContext = context;
}

// --- Core Functions ---

function createLightboxElement(): void {
    if (lightboxElement) return;

    lightboxElement = DOM.lightbox;
    if (!lightboxElement) return;

    lightboxImage = h("img", {
        alt: "Lightbox Image",
        className:
            "max-w-[90vw] max-h-[90vh] object-contain cursor-grab active:cursor-grabbing shadow-soft transition-opacity duration-150",
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

    lightboxElement.replaceChildren(lightboxImage, closeButton, prevButton, nextButton);

    lightboxElement.addEventListener("click", handleBackdropClick);
    lightboxImage.addEventListener("mousedown", handlePanStart);
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
}

function openLightbox(localIndex: number): void {
    if (isOpen || !lightboxContext) return;

    createLightboxElement();
    if (!lightboxElement) return;

    isOpen = true;
    resetZoomAndPosition();
    void loadImageIntoLightbox(localIndex);

    setVisible(lightboxElement, true);
    bodyScroll.lock();

    panController = renewController(panController);
    window.addEventListener("mousemove", handlePanMove, { signal: panController.signal });
    window.addEventListener("mouseup", handlePanEnd, { signal: panController.signal });
}

export function closeLightbox(): void {
    if (!isOpen || !lightboxElement) return;

    isOpen = false;
    loadGuard.next();
    setVisible(lightboxElement, false);
    bodyScroll.unlock();
    resetZoomAndPosition();

    panController.abort();
}

async function loadImageIntoLightbox(localIndex: number): Promise<void> {
    if (!lightboxImage || !lightboxContext) return;
    const { chapterStartIndex, imagesBasePath } = lightboxContext;
    const myToken = loadGuard.next();

    currentImageIndex = localIndex;
    updateButtonVisibility();
    lightboxImage.classList.add("opacity-0");

    const img = await loadImage(imagesBasePath, chapterStartIndex + localIndex + 1);
    if (!loadGuard.isCurrent(myToken) || !lightboxImage) return;

    if (img) {
        lightboxImage.src = img.src;
        lightboxImage.classList.remove("opacity-0");
    } else {
        console.warn(`Lightbox: failed to load page ${localIndex}`);
    }
}

export function navigateLightbox(direction: number): void {
    if (!isOpen || !lightboxContext) return;

    const newIndex = clamp(currentImageIndex + direction, 0, lightboxContext.pageCount - 1);
    if (newIndex === currentImageIndex) return;

    resetZoomAndPosition();
    void loadImageIntoLightbox(newIndex);
    lightboxContext.onNavigate?.(newIndex);
}

function updateButtonVisibility(): void {
    if (!prevButton || !nextButton || !lightboxContext) return;

    toggleClass(prevButton, "invisible", currentImageIndex <= 0);
    toggleClass(nextButton, "invisible", currentImageIndex >= lightboxContext.pageCount - 1);
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

export function handleImageMouseDown(event: MouseEvent, localIndex: number): void {
    isLongPress = false;
    clearTimeout(longPressTimeout);

    if (event.button !== 0) return;

    longPressTimeout = setTimeout(() => {
        isLongPress = true;
        openLightbox(localIndex);
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
