import { ViewerState, getImageUrl } from "@/state";
import { clamp, createGenerationGuard, rafThrottle } from "@/core/utils";
import { createIconButton } from "@/core/icons";
import { getDoubleClickedPageIndex } from "./chapter";
import { h } from "@/core/dom-utils";
import { scrollToPage } from "./virtualizer";

const MAX_ZOOM_LIGHTBOX = 40;
const CLICK_ZOOM_SCALE = 2.5;

interface Lightbox {
    element: HTMLDialogElement;
    step: (direction: number) => void;
}

export function createLightbox(element: HTMLElement): Lightbox {
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

    const image = h("img", {
        alt: "Lightbox Image",
        className:
            "max-w-[90vw] max-h-[90vh] object-contain touch-none cursor-grab active:cursor-grabbing transition-opacity duration-150",
        onclick: (event: MouseEvent) => {
            if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return;
            if (currentScale > 1) {
                resetZoomAndPosition();
            } else {
                zoomToPoint(event.clientX, event.clientY, CLICK_ZOOM_SCALE);
            }
        },
        ondragstart: (event: Event) => event.preventDefault(),
        onload: () => image.classList.remove("opacity-0"),
        onlostpointercapture: () => {
            isDragging = false;
        },
        onpointerdown: (event: PointerEvent) => {
            if (event.button !== 0) return;

            image.setPointerCapture(event.pointerId);
            isDragging = true;
            startX = event.clientX - currentTranslateX;
            startY = event.clientY - currentTranslateY;
            downX = event.clientX;
            downY = event.clientY;
        },
        onpointermove: (event: PointerEvent) => {
            if (isDragging) throttledPan(event.clientX, event.clientY);
        },
    });

    const iconOptions = { size: 18 };

    const closeButton = createIconButton("X", {
        className: "btn-icon-lightbox top-6 right-6",
        iconOptions,
        onClick: close,
        tooltip: "Close",
    });
    const prevButton = createIconButton("ChevronLeft", {
        className: "btn-icon-lightbox top-1/2 left-6 -translate-y-1/2",
        iconOptions,
        onClick: () => navigate(-1),
        tooltip: "Previous image",
    });
    const nextButton = createIconButton("ChevronRight", {
        className: "btn-icon-lightbox top-1/2 right-6 -translate-y-1/2",
        iconOptions,
        onClick: () => navigate(1),
        tooltip: "Next image",
    });
    const rotateButton = createIconButton("RotateCw", {
        className: "btn-icon-lightbox top-6 left-6",
        iconOptions,
        onClick: rotate,
        tooltip: "Rotate 90°",
    });
    const flipButton = createIconButton("FlipHorizontal2", {
        className: "btn-icon-lightbox top-20 left-6",
        iconOptions,
        onClick: flip,
        tooltip: "Flip horizontal",
    });

    const root = h(
        "dialog",
        {
            className:
                "fixed inset-0 m-0 h-full w-full max-h-none max-w-none overflow-hidden border-0 p-0 text-inherit bg-ink/95 backdrop-blur-lg cursor-zoom-out open:flex items-center justify-center",
            id: "lightbox",
            onclick: (event: MouseEvent) => {
                if (event.target === root) close();
            },
            onclose: handleClosed,
        },
        image,
        closeButton,
        prevButton,
        nextButton,
        rotateButton,
        flipButton,
    );
    image.addEventListener("wheel", handleZoom, { passive: false });

    function open(localIndex: number): void {
        if (root.open || !ViewerState.activeChapter) return;

        resetZoomAndPosition();
        void loadImage(localIndex);
        root.showModal();
    }

    function close(): void {
        root.close();
    }

    function handleClosed(): void {
        loadGuard.next();
        image.src = "";
        resetZoomAndPosition();
    }

    async function loadImage(localIndex: number): Promise<void> {
        const chapter = ViewerState.activeChapter;
        if (!chapter) return;
        const myToken = loadGuard.next();

        currentImageIndex = localIndex;
        updateButtonVisibility();
        image.classList.add("opacity-0");

        const url = await getImageUrl(chapter, localIndex);
        if (!loadGuard.isCurrent(myToken) || !url) return;
        image.src = url;
    }

    function navigate(direction: number): void {
        if (!root.open || !ViewerState.activeChapter) return;

        const newIndex = clamp(currentImageIndex + direction, 0, ViewerState.activeChapter.pageCount - 1);
        if (newIndex === currentImageIndex) return;

        resetZoomAndPosition();
        void loadImage(newIndex);
        scrollToPage(newIndex, 0, "smooth");
    }

    function updateButtonVisibility(): void {
        const context = ViewerState.activeChapter;
        if (!context) return;

        prevButton.classList.toggle("invisible", currentImageIndex <= 0);
        nextButton.classList.toggle("invisible", currentImageIndex >= context.pageCount - 1);
    }

    function resetZoomAndPosition(): void {
        currentScale = 1;
        currentTranslateX = currentTranslateY = currentRotation = 0;
        isFlipped = isDragging = false;
        applyTransform();
    }

    const throttledPan = rafThrottle((clientX: number, clientY: number) => {
        currentTranslateX = clientX - startX;
        currentTranslateY = clientY - startY;
        applyTransform();
    });

    function zoomToPoint(clientX: number, clientY: number, targetScale: number): void {
        const minScale = 1;
        const newScale = clamp(targetScale, minScale, MAX_ZOOM_LIGHTBOX);
        if (newScale === currentScale) return;

        const rect = image.getBoundingClientRect();
        const originX = clientX - rect.left - rect.width / 2;
        const originY = clientY - rect.top - rect.height / 2;

        const scaleDelta = newScale / currentScale - 1;
        currentTranslateX -= originX * scaleDelta;
        currentTranslateY -= originY * scaleDelta;

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

    function rotate(): void {
        currentRotation = (currentRotation + 90) % 360;
        applyTransform();
    }

    function flip(): void {
        isFlipped = !isFlipped;
        applyTransform();
    }

    function applyTransform(): void {
        const parts = [`translate(${currentTranslateX}px, ${currentTranslateY}px)`, `scale(${currentScale})`];
        if (isFlipped) parts.push("scaleX(-1)");
        if (currentRotation !== 0) parts.push(`rotate(${currentRotation}deg)`);
        image.style.transform = parts.join(" ");
    }

    element.addEventListener("dblclick", (event) => {
        const index = getDoubleClickedPageIndex(event);
        if (index !== null) open(index);
    });
    ViewerState.onChange("activeChapter", (context) => {
        if (!context) close();
    });

    return { element: root, step: navigate };
}
