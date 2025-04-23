import Config from "../core/Config";
import { DOM, $$ } from "../core/DOMUtils";
import { State } from "../core/State";

import { loadMangaSettings, saveMangaSettings } from "./SettingsManager";
import { updateZoomLevelDisplay } from "./SidebarManager";

// --- Zoom Actions ---

function setZoomLevel(newZoomLevel) {
    if (!State.currentManga) return;

    const clampedZoom = Math.max(Config.MIN_ZOOM, newZoomLevel);
    const settings = loadMangaSettings(State.currentManga.id);

    if (settings.zoomLevel !== clampedZoom) {
        // Calculate scroll position relative to content height BEFORE zoom change
        const viewportHeight = window.innerHeight;
        const oldScrollHeight = document.documentElement.scrollHeight;
        const oldScrollTop = window.scrollY;
        const scrollRatio = oldScrollHeight > viewportHeight ? oldScrollTop / (oldScrollHeight - viewportHeight) : 0;

        settings.zoomLevel = clampedZoom;
        saveMangaSettings(State.currentManga.id, settings);
        applyCurrentZoom(); // Apply the new zoom level to images

        // Restore scroll position relative to NEW content height AFTER zoom change
        // Use requestAnimationFrame to wait for layout reflow after style changes
        requestAnimationFrame(() => {
            const newScrollHeight = document.documentElement.scrollHeight;
            const newScrollTop =
                newScrollHeight > viewportHeight ? scrollRatio * (newScrollHeight - viewportHeight) : 0;
            window.scrollTo({
                top: Math.round(newScrollTop),
                behavior: "instant",
            }); // Use instant scroll during zoom adjustment
        });
    }
}

export function zoomIn() {
    if (!State.currentManga) return;
    const settings = loadMangaSettings(State.currentManga.id);
    setZoomLevel((settings.zoomLevel || Config.DEFAULT_ZOOM_LEVEL) + Config.ZOOM_STEP);
}

export function zoomOut() {
    if (!State.currentManga) return;
    const settings = loadMangaSettings(State.currentManga.id);
    setZoomLevel((settings.zoomLevel || Config.DEFAULT_ZOOM_LEVEL) - Config.ZOOM_STEP);
}

export function resetZoom() {
    setZoomLevel(Config.DEFAULT_ZOOM_LEVEL);
}

// --- Applying Styles ---

/**
 * Applies zoom and image fit styles to the images.
 * @param {string|null} [overrideFit=null] - If provided, uses this image fit mode instead of the saved setting (for visual previews).
 */
export function applyCurrentZoom(overrideFit = null) {
    if (!DOM.imageContainer || !State.currentManga) return;

    const settings = loadMangaSettings(State.currentManga.id);
    const imageFit = overrideFit ?? settings.imageFit ?? Config.DEFAULT_IMAGE_FIT;
    const zoomLevel = settings.zoomLevel || Config.DEFAULT_ZOOM_LEVEL;
    const images = $$("img.manga-image", DOM.imageContainer);
    const containerWidth = DOM.imageContainer.clientWidth;

    images.forEach((img) => {
        const originalWidth = parseFloat(img.dataset.originalWidth);
        const originalHeight = parseFloat(img.dataset.originalHeight);

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
            case "height":
                img.style.height = `${window.innerHeight * zoomLevel}px`;
                img.style.width = "auto";
                img.style.maxWidth = "none";
                break;
            case "width":
                img.style.width = `${100 * zoomLevel}%`;
                img.style.maxWidth = `${containerWidth * zoomLevel}px`;
                img.style.height = "auto";
                break;
            case "original":
            default:
                img.style.width = `${originalWidth * zoomLevel}px`;
                img.style.height = "auto";
                img.style.maxWidth = "none";
                break;
        }
    });

    // Update the zoom level display in the sidebar
    updateZoomLevelDisplay(zoomLevel);
}

// Apply spacing between images
export function applySpacing() {
    if (!DOM.imageContainer) return;
    const settings = loadMangaSettings(State.currentManga.id);
    const spacing = settings.collapseSpacing ? 0 : (settings.spacingAmount ?? Config.DEFAULT_SPACING_AMOUNT); // Use nullish coalescing

    DOM.imageContainer.style.gap = `${spacing}px`;
}

// --- Initialization ---
export function initZoomManager() {
    // Apply initial zoom/spacing if viewer is already visible (e.g., on reload)
    if (State.currentView === "viewer") {
        applyCurrentZoom();
        applySpacing();
    }
}
