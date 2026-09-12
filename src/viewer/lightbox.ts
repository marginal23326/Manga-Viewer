import { bodyScroll, h, requireElement, setVisible, toggleClass } from "@/core/dom-utils";
import { clamp, createAbortScope, createGenerationGuard, rafThrottle } from "@/core/utils";
import type { ChapterContext } from "./virtualizer";
import { createIconButton } from "@/core/icons";
import { getImageUrl } from "@/state";

const MAX_ZOOM_LIGHTBOX = 40;
const CLICK_ZOOM_SCALE = 2.5;

export interface LightboxContext extends ChapterContext {
    onNavigate?: (localIndex: number) => void;
}

const LIGHTBOX_ICON_BTN_CLASS =
    "absolute flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all duration-150 z-[80] cursor-pointer";

const lightboxRoot = requireElement("#lightbox");

let lightboxImage: HTMLImageElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;

let lightboxContext: LightboxContext | null = null;

let isOpen = false;
const panScope = createAbortScope();
let currentImageIndex = -1;
let currentObjectUrl: string | null = null;
const loadGuard = createGenerationGuard();

function setCurrentUrl(url: string | null): void {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = url;
}
let currentScale = 1;
let currentTranslateX = 0;
let currentTranslateY = 0;
let currentRotation = 0;
let isFlipped = false;
let isDragging = false;
let startX = 0;
let startY = 0;
let downX = 0;
let downY = 0;

export function isLightboxOpen(): boolean {
    return isOpen;
}

export function setLightboxContext(context: LightboxContext | null): void {
    lightboxContext = context;
}

// --- Core Functions ---

function initLightbox(): void {
    if (lightboxImage) return;

    lightboxImage = h("img", {
        alt: "Lightbox Image",
        className:
            "max-w-[90vw] max-h-[90vh] object-contain cursor-grab active:cursor-grabbing shadow-soft transition-opacity duration-150",
    });

    const iconOptions = { size: 18 };

    const closeButton = createIconButton("X", {
        className: `${LIGHTBOX_ICON_BTN_CLASS} top-6 right-6`,
        iconOptions,
        onClick: closeLightbox,
        stopPropagation: true,
        tooltip: "Close",
    });
    prevButton = createIconButton("ChevronLeft", {
        className: `${LIGHTBOX_ICON_BTN_CLASS} top-1/2 left-6 -translate-y-1/2`,
        iconOptions,
        onClick: () => navigateLightbox(-1),
        stopPropagation: true,
        tooltip: "Previous image",
    });
    nextButton = createIconButton("ChevronRight", {
        className: `${LIGHTBOX_ICON_BTN_CLASS} top-1/2 right-6 -translate-y-1/2`,
        iconOptions,
        onClick: () => navigateLightbox(1),
        stopPropagation: true,
        tooltip: "Next image",
    });
    const rotateButton = createIconButton("RotateCw", {
        className: `${LIGHTBOX_ICON_BTN_CLASS} top-6 left-6`,
        iconOptions,
        onClick: rotateLightbox,
        stopPropagation: true,
        tooltip: "Rotate 90°",
    });
    const flipButton = createIconButton("FlipHorizontal2", {
        className: `${LIGHTBOX_ICON_BTN_CLASS} top-20 left-6`,
        iconOptions,
        onClick: flipLightbox,
        stopPropagation: true,
        tooltip: "Flip horizontal",
    });

    lightboxRoot.replaceChildren(lightboxImage, closeButton, prevButton, nextButton, rotateButton, flipButton);

    lightboxRoot.addEventListener("click", (event) => {
        if (event.target === lightboxRoot) {
            closeLightbox();
        }
    });
    lightboxImage.addEventListener("mousedown", handlePanStart);
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
    lightboxImage.addEventListener("click", handleImageClick);
    lightboxImage.addEventListener("load", () => lightboxImage?.classList.remove("opacity-0"));
}

export function openLightbox(localIndex: number): void {
    if (isOpen || !lightboxContext) return;

    initLightbox();

    isOpen = true;
    resetZoomAndPosition();
    void loadImageIntoLightbox(localIndex);

    setVisible(lightboxRoot, true);
    bodyScroll.lock();

    panScope.renew();
    addEventListener("mousemove", handlePanMove, { signal: panScope.signal });
    addEventListener("mouseup", handlePanEnd, { signal: panScope.signal });
}

export function closeLightbox(): void {
    if (!isOpen) return;

    isOpen = false;
    loadGuard.next();
    setCurrentUrl(null);
    setVisible(lightboxRoot, false);
    bodyScroll.unlock();
    resetZoomAndPosition();

    panScope.abort();
}

async function loadImageIntoLightbox(localIndex: number): Promise<void> {
    if (!lightboxImage || !lightboxContext) return;
    const { chapterStartIndex, mangaId } = lightboxContext;
    const myToken = loadGuard.next();

    currentImageIndex = localIndex;
    updateButtonVisibility();
    lightboxImage.classList.add("opacity-0");

    const url = await getImageUrl(mangaId, chapterStartIndex + localIndex);
    if (!loadGuard.isCurrent(myToken)) {
        if (url) URL.revokeObjectURL(url);
        return;
    }

    if (url) {
        setCurrentUrl(url);
        lightboxImage.src = url;
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
    if (!lightboxContext) return;

    toggleClass(prevButton, "invisible", currentImageIndex <= 0);
    toggleClass(nextButton, "invisible", currentImageIndex >= lightboxContext.pageCount - 1);
}

function resetZoomAndPosition(): void {
    currentScale = 1;
    currentTranslateX = currentTranslateY = 0;
    currentRotation = 0;
    isFlipped = false;
    isDragging = false;
    applyTransform();
}

// --- Panning Logic ---
function handlePanStart(event: MouseEvent): void {
    if (event.button !== 0) return;

    event.preventDefault();
    isDragging = true;
    startX = event.clientX - currentTranslateX;
    startY = event.clientY - currentTranslateY;
    downX = event.clientX;
    downY = event.clientY;
}

const throttledPan = rafThrottle((clientX: number, clientY: number) => {
    currentTranslateX = clientX - startX;
    currentTranslateY = clientY - startY;
    applyTransform();
});

function handlePanMove(event: MouseEvent): void {
    if (!isDragging) return;

    event.preventDefault();
    throttledPan(event.clientX, event.clientY);
}

function handlePanEnd(): void {
    isDragging = false;
}

// --- Zoom Logic ---
function zoomToPoint(clientX: number, clientY: number, targetScale: number): void {
    if (!lightboxImage) return;

    const minScale = 1;
    const newScale = clamp(targetScale, minScale, MAX_ZOOM_LIGHTBOX);
    if (newScale === currentScale) return;

    const rect = lightboxImage.getBoundingClientRect();
    const originX = clientX - rect.left - rect.width / 2;
    const originY = clientY - rect.top - rect.height / 2;

    const scaleDelta = newScale / currentScale - 1;
    currentTranslateX -= originX * scaleDelta;
    currentTranslateY -= originY * scaleDelta;

    // --- Centering Logic on Zoom Out ---
    const centeringThreshold = 1.5;
    if (newScale < currentScale && newScale < centeringThreshold) {
        const factor = (newScale - minScale) / (centeringThreshold - minScale);
        currentTranslateX *= factor;
        currentTranslateY *= factor;
    }

    if (newScale === minScale) {
        currentTranslateX = currentTranslateY = 0;
    }

    currentScale = newScale;
    applyTransform();
}

function handleZoom(event: WheelEvent): void {
    event.preventDefault();
    zoomToPoint(event.clientX, event.clientY, currentScale * (event.deltaY > 0 ? 0.8 : 1.25));
}

function handleImageClick(event: MouseEvent): void {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
    if (currentScale > 1) {
        resetZoomAndPosition();
    } else {
        zoomToPoint(event.clientX, event.clientY, CLICK_ZOOM_SCALE);
    }
}

function rotateLightbox(): void {
    currentRotation = (currentRotation + 90) % 360;
    applyTransform();
}

function flipLightbox(): void {
    isFlipped = !isFlipped;
    applyTransform();
}

// --- Apply Transform ---
function applyTransform(): void {
    if (!lightboxImage) return;
    const parts = [`translate(${currentTranslateX}px, ${currentTranslateY}px)`, `scale(${currentScale})`];
    if (isFlipped) parts.push("scaleX(-1)");
    if (currentRotation !== 0) parts.push(`rotate(${currentRotation}deg)`);
    lightboxImage.style.transform = parts.join(" ");
}
