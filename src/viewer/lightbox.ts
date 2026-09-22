import { ViewerState, getImageUrl } from "@/state";
import { bodyScroll, h, requireElement, setVisible, toggleClass } from "@/core/dom-utils";
import { clamp, createAbortScope, createGenerationGuard, rafThrottle } from "@/core/utils";
import { createIconButton } from "@/core/icons";
import { scrollToActiveIndex } from "./virtualizer";

const MAX_ZOOM_LIGHTBOX = 40;
const CLICK_ZOOM_SCALE = 2.5;

const lightboxRoot = requireElement("#lightbox");

let lightboxImage: HTMLImageElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;

let isOpen = false;
const panScope = createAbortScope();
let currentImageIndex = -1;
const loadGuard = createGenerationGuard();

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

export function initLightbox(): void {
    ViewerState.onChange("activeChapter", (context) => {
        if (!context && isOpen) closeLightbox();
    });
}

// --- Core Functions ---

function buildLightboxDom(): void {
    if (lightboxImage) return;

    lightboxImage = h("img", {
        alt: "Lightbox Image",
        className:
            "max-w-[90vw] max-h-[90vh] object-contain cursor-grab active:cursor-grabbing shadow-soft transition-opacity duration-150",
        onclick: (event: MouseEvent) => {
            if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
            if (currentScale > 1) {
                resetZoomAndPosition();
            } else {
                zoomToPoint(event.clientX, event.clientY, CLICK_ZOOM_SCALE);
            }
        },
        onload: () => lightboxImage?.classList.remove("opacity-0"),
        onmousedown: (event: MouseEvent) => {
            if (event.button !== 0) return;

            event.preventDefault();
            isDragging = true;
            startX = event.clientX - currentTranslateX;
            startY = event.clientY - currentTranslateY;
            downX = event.clientX;
            downY = event.clientY;
        },
    });

    const iconOptions = { size: 18 };

    const closeButton = createIconButton("X", {
        className: "btn-icon-lightbox top-6 right-6",
        iconOptions,
        onClick: closeLightbox,
        stopPropagation: true,
        tooltip: "Close",
    });
    prevButton = createIconButton("ChevronLeft", {
        className: "btn-icon-lightbox top-1/2 left-6 -translate-y-1/2",
        iconOptions,
        onClick: () => navigateLightbox(-1),
        stopPropagation: true,
        tooltip: "Previous image",
    });
    nextButton = createIconButton("ChevronRight", {
        className: "btn-icon-lightbox top-1/2 right-6 -translate-y-1/2",
        iconOptions,
        onClick: () => navigateLightbox(1),
        stopPropagation: true,
        tooltip: "Next image",
    });
    const rotateButton = createIconButton("RotateCw", {
        className: "btn-icon-lightbox top-6 left-6",
        iconOptions,
        onClick: rotateLightbox,
        stopPropagation: true,
        tooltip: "Rotate 90°",
    });
    const flipButton = createIconButton("FlipHorizontal2", {
        className: "btn-icon-lightbox top-20 left-6",
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
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
}

export function openLightbox(localIndex: number): void {
    if (isOpen || !ViewerState.activeChapter) return;

    buildLightboxDom();

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
    if (lightboxImage) lightboxImage.src = "";
    setVisible(lightboxRoot, false);
    bodyScroll.unlock();
    resetZoomAndPosition();

    panScope.abort();
}

async function loadImageIntoLightbox(localIndex: number): Promise<void> {
    const chapter = ViewerState.activeChapter;
    if (!lightboxImage || !chapter) return;
    const myToken = loadGuard.next();

    currentImageIndex = localIndex;
    updateButtonVisibility();
    lightboxImage.classList.add("opacity-0");

    const url = await getImageUrl(chapter, localIndex);
    if (!loadGuard.isCurrent(myToken) || !url) return;
    lightboxImage.src = url;
}

export function navigateLightbox(direction: number): void {
    if (!isOpen || !ViewerState.activeChapter) return;

    const newIndex = clamp(currentImageIndex + direction, 0, ViewerState.activeChapter.pageCount - 1);
    if (newIndex === currentImageIndex) return;

    resetZoomAndPosition();
    void loadImageIntoLightbox(newIndex);
    scrollToActiveIndex(newIndex, 0, "smooth");
}

function updateButtonVisibility(): void {
    const context = ViewerState.activeChapter;
    if (!context) return;

    toggleClass(prevButton, "invisible", currentImageIndex <= 0);
    toggleClass(nextButton, "invisible", currentImageIndex >= context.pageCount - 1);
}

function resetZoomAndPosition(): void {
    currentScale = 1;
    currentTranslateX = currentTranslateY = currentRotation = 0;
    isFlipped = isDragging = false;
    applyTransform();
}

// --- Panning Logic ---
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
