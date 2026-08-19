import {
    DEFAULT_MANGA_SETTINGS,
    PersistState,
    getCurrentManga,
    getCurrentSettings,
    getSettings,
    updateSettings,
} from "@/state";
import { DOM, getMangaImages } from "@/core/dom-utils";
import Config from "@/core/config";
import type { ImageFit } from "@/types";
import { emitAppEvent } from "@/core/app-events";
import { updateZoomLevelDisplay } from "@/viewer/status-display";

// --- Zoom Actions ---

function setZoomLevel(newZoomLevel: number): void {
    const manga = getCurrentManga();
    if (!manga) return;

    const clampedZoom = Math.max(Config.MIN_ZOOM, newZoomLevel);
    const settings = getSettings(manga.id);

    if (settings.zoomLevel !== clampedZoom) {
        const viewportHeight = window.innerHeight;
        const oldScrollHeight = document.documentElement.scrollHeight;
        const oldScrollTop = window.scrollY;
        const scrollRatio = oldScrollHeight > viewportHeight ? oldScrollTop / (oldScrollHeight - viewportHeight) : 0;

        updateSettings(manga.id, { zoomLevel: clampedZoom });
        applyCurrentZoom();

        requestAnimationFrame(() => {
            const newScrollHeight = document.documentElement.scrollHeight;
            const newScrollTop =
                newScrollHeight > viewportHeight ? scrollRatio * (newScrollHeight - viewportHeight) : 0;
            window.scrollTo({
                top: Math.round(newScrollTop),
            });
        });
    }
}

export function zoomIn(): void {
    const settings = getCurrentSettings();
    setZoomLevel(settings.zoomLevel + Config.ZOOM_STEP);
}

export function zoomOut(): void {
    const settings = getCurrentSettings();
    setZoomLevel(settings.zoomLevel - Config.ZOOM_STEP);
}

export function resetZoom(): void {
    setZoomLevel(DEFAULT_MANGA_SETTINGS.zoomLevel);
}

export function computeAnalyticPageHeight(
    naturalWidth: number | null,
    naturalHeight: number | null,
    imageFit: ImageFit,
    zoomLevel: number,
    containerWidth: number,
): number | null {
    if (imageFit === "height") {
        return window.innerHeight * zoomLevel;
    }
    if (!naturalWidth || !naturalHeight) {
        return null;
    }
    if (imageFit === "width") {
        const renderedWidth = containerWidth * zoomLevel;
        return naturalHeight * (renderedWidth / naturalWidth);
    }
    return naturalHeight * zoomLevel;
}

export function applyPageStyle(
    img: HTMLImageElement,
    imageFit: ImageFit,
    zoomLevel: number,
    containerWidth: number,
): void {
    const originalWidth = Number(img.dataset.originalWidth);
    const originalHeight = Number(img.dataset.originalHeight);

    // Reset styles first
    img.style.width = "";
    img.style.height = "";
    img.style.maxWidth = "";

    if (!originalWidth || !originalHeight) {
        img.style.maxWidth = `${100 * zoomLevel}%`;
        img.style.height = "auto";
        return;
    }

    switch (imageFit) {
        case "height": {
            img.style.height = `${window.innerHeight * zoomLevel}px`;
            img.style.width = "auto";
            img.style.maxWidth = "none";
            break;
        }
        case "width": {
            img.style.width = `${100 * zoomLevel}%`;
            img.style.maxWidth = `${containerWidth * zoomLevel}px`;
            img.style.height = "auto";
            break;
        }
        default: {
            img.style.width = `${originalWidth * zoomLevel}px`;
            img.style.height = "auto";
            img.style.maxWidth = "none";
            break;
        }
    }
}

// --- Applying Styles ---

/**
 * Applies zoom and image fit styles to the currently-mounted images.
 * @param overrideFit - If provided, uses this image fit mode instead of the saved setting (for visual previews).
 */
export function applyPageStylesToImages(
    images: Iterable<HTMLImageElement>,
    imageFit: ImageFit,
    zoomLevel: number,
    containerWidth: number,
): void {
    for (const img of images) {
        applyPageStyle(img, imageFit, zoomLevel, containerWidth);
    }
}

export function applyCurrentZoom(overrideFit: ImageFit | null = null): void {
    if (!DOM.imageContainer) return;
    const { imageContainer } = DOM;

    const { imageFit: savedImageFit, zoomLevel } = getCurrentSettings();
    const imageFit = overrideFit ?? savedImageFit;
    const containerWidth = imageContainer.clientWidth;

    applyPageStylesToImages(getMangaImages(), imageFit, zoomLevel, containerWidth);

    updateZoomLevelDisplay(zoomLevel);
    emitAppEvent("pageSizingChanged");
}

// Apply spacing between images
export function applySpacing(): void {
    if (!DOM.imageContainer) return;
    const { imageContainer } = DOM;

    const { collapseSpacing, spacingAmount } = getCurrentSettings();
    const spacing = collapseSpacing ? 0 : spacingAmount;

    imageContainer.style.gap = `${spacing}px`;
    emitAppEvent("pageSizingChanged");
}

// --- Initialization ---
export function initZoom(): void {
    // Apply initial zoom/spacing if viewer is already visible (e.g., on reload)
    if (PersistState.currentView === "viewer") {
        applyCurrentZoom();
        applySpacing();
    }
}
