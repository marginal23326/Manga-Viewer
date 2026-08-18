import { DEFAULT_MANGA_SETTINGS, getCurrentSettings, getSettings, updateSettings } from "@/state/manga-settings";
import Config from "@/core/config";
import { DOM } from "@/core/dom-utils";
import type { ImageFit } from "@/types";
import { PersistState } from "@/state";
import { getCurrentManga } from "@/state/manga-library";
import { getMangaImages } from "@/core/utils";
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
                behavior: "instant",
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

// --- Applying Styles ---

/**
 * Applies zoom and image fit styles to the images.
 * @param overrideFit - If provided, uses this image fit mode instead of the saved setting (for visual previews).
 */
export function applyCurrentZoom(overrideFit: ImageFit | null = null): void {
    if (!DOM.imageContainer) return;
    const { imageContainer } = DOM;

    const { imageFit: savedImageFit, zoomLevel } = getCurrentSettings();
    const imageFit = overrideFit ?? savedImageFit;
    const images = getMangaImages();
    const containerWidth = imageContainer.clientWidth;

    images.forEach((img) => {
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

        // Apply styles based on the determined imageFit and zoomLevel
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
    });

    // Update the zoom level display in the sidebar
    updateZoomLevelDisplay(zoomLevel);
}

// Apply spacing between images
export function applySpacing(): void {
    if (!DOM.imageContainer) return;
    const { imageContainer } = DOM;

    const { collapseSpacing, spacingAmount } = getCurrentSettings();
    const spacing = collapseSpacing ? 0 : spacingAmount;

    imageContainer.style.gap = `${spacing}px`;
}

// --- Initialization ---
export function initZoom(): void {
    // Apply initial zoom/spacing if viewer is already visible (e.g., on reload)
    if (PersistState.currentView === "viewer") {
        applyCurrentZoom();
        applySpacing();
    }
}
