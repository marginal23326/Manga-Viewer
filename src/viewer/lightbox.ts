import { DOM, bodyScroll, h, setVisible, toggleClass } from "@/core/dom-utils";
import { type IconName, iconSvg } from "@/core/icons";
import { clamp, createGenerationGuard, renewController } from "@/core/utils";
import type { ChapterContext } from "./virtualizer";
import Config from "@/core/config";
import { loadImage } from "./image-loader";

export interface LightboxContext extends ChapterContext {
    onNavigate?: (localIndex: number) => void;
}

const LIGHTBOX_ICON_BTN_CLASS =
    "absolute flex items-center justify-center w-11 h-11 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 active:scale-95 transition-all duration-150 z-[80] cursor-pointer";

let lightboxImage: HTMLImageElement | null = null;
let prevButton: HTMLButtonElement | null = null;
let nextButton: HTMLButtonElement | null = null;

let lightboxContext: LightboxContext | null = null;

let isOpen = false;
let panController = new AbortController();
let currentImageIndex = -1;
const loadGuard = createGenerationGuard();
let currentScale = 1;
let currentTranslateX = 0;
let currentTranslateY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

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

    const createBtn = (icon: IconName, pos: string, title: string, onclick: () => void) => {
        const btn = h("button", {
            className: `${LIGHTBOX_ICON_BTN_CLASS} ${pos}`,
            onclick: (e: MouseEvent) => {
                e.stopPropagation();
                onclick();
            },
            title,
        });
        btn.append(iconSvg(icon, { size: 18 }));
        return btn;
    };

    const closeButton = createBtn("X", "top-6 right-6", "Close", closeLightbox);
    prevButton = createBtn("ChevronLeft", "top-1/2 left-6 -translate-y-1/2", "Previous image", () =>
        navigateLightbox(-1),
    );
    nextButton = createBtn("ChevronRight", "top-1/2 right-6 -translate-y-1/2", "Next image", () => navigateLightbox(1));

    const root = DOM.lightbox!;
    root.replaceChildren(lightboxImage, closeButton, prevButton, nextButton);

    root.addEventListener("click", (event) => {
        if (event.target === root) {
            closeLightbox();
        }
    });
    lightboxImage.addEventListener("mousedown", handlePanStart);
    lightboxImage.addEventListener("wheel", handleZoom, { passive: false });
}

export function openLightbox(localIndex: number): void {
    if (isOpen || !lightboxContext) return;

    initLightbox();

    isOpen = true;
    resetZoomAndPosition();
    void loadImageIntoLightbox(localIndex);

    setVisible(DOM.lightbox, true);
    bodyScroll.lock();

    panController = renewController(panController);
    addEventListener("mousemove", handlePanMove, { signal: panController.signal });
    addEventListener("mouseup", handlePanEnd, { signal: panController.signal });
}

export function closeLightbox(): void {
    if (!isOpen) return;

    isOpen = false;
    loadGuard.next();
    setVisible(DOM.lightbox, false);
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
    if (!loadGuard.isCurrent(myToken)) return;

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
    if (!lightboxContext) return;

    toggleClass(prevButton, "invisible", currentImageIndex <= 0);
    toggleClass(nextButton, "invisible", currentImageIndex >= lightboxContext.pageCount - 1);
}

function resetZoomAndPosition(): void {
    currentScale = 1;
    currentTranslateX = currentTranslateY = 0;
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
}

function handlePanMove(event: MouseEvent): void {
    if (!isDragging) return;

    event.preventDefault();
    currentTranslateX = event.clientX - startX;
    currentTranslateY = event.clientY - startY;

    applyTransform();
}

function handlePanEnd(): void {
    isDragging = false;
}

// --- Zoom Logic ---
function handleZoom(event: WheelEvent): void {
    event.preventDefault();
    if (!lightboxImage) return;

    const minScale = 1;
    const isZoomingOut = event.deltaY > 0;
    const newScale = clamp(currentScale * (isZoomingOut ? 0.8 : 1.25), minScale, Config.MAX_ZOOM_LIGHTBOX);
    if (newScale === currentScale) return;

    const rect = lightboxImage.getBoundingClientRect();
    const originX = event.clientX - rect.left - rect.width / 2;
    const originY = event.clientY - rect.top - rect.height / 2;

    const scaleDelta = newScale / currentScale - 1;
    currentTranslateX -= originX * scaleDelta;
    currentTranslateY -= originY * scaleDelta;

    // --- Centering Logic on Zoom Out ---
    const centeringThreshold = 1.5;
    if (isZoomingOut && newScale < centeringThreshold) {
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

// --- Apply Transform ---
function applyTransform(): void {
    if (!lightboxImage) return;
    lightboxImage.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
}
