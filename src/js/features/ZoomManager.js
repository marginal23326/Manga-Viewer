import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { DOM, $$, addClass, removeClass } from '../core/DOMUtils';
import { loadMangaSettings, saveMangaSettings } from './SettingsManager';
import { updateZoomLevelDisplay } from './SidebarManager';

// --- Zoom Actions ---

function setZoomLevel(newZoomLevel) {
    if (!AppState.currentManga) return;

    const clampedZoom = Math.max(Config.MIN_ZOOM, newZoomLevel);
    const settings = loadMangaSettings(AppState.currentManga.id);

    if (settings.zoomLevel !== clampedZoom) {
        // Calculate scroll position relative to content height BEFORE zoom change
        const viewportHeight = window.innerHeight;
        const oldScrollHeight = document.documentElement.scrollHeight;
        const oldScrollTop = window.scrollY;
        const scrollRatio = oldScrollHeight > viewportHeight ? oldScrollTop / (oldScrollHeight - viewportHeight) : 0;

        settings.zoomLevel = clampedZoom;
        saveMangaSettings(AppState.currentManga.id, settings);
        applyCurrentZoom(); // Apply the new zoom level to images

        // Restore scroll position relative to NEW content height AFTER zoom change
        // Use requestAnimationFrame to wait for layout reflow after style changes
        requestAnimationFrame(() => {
            const newScrollHeight = document.documentElement.scrollHeight;
            const newScrollTop = newScrollHeight > viewportHeight ? scrollRatio * (newScrollHeight - viewportHeight) : 0;
            window.scrollTo({ top: Math.round(newScrollTop), behavior: 'instant' }); // Use instant scroll during zoom adjustment
        });
    }
}

export function zoomIn() {
    if (!AppState.currentManga) return;
    const settings = loadMangaSettings(AppState.currentManga.id);
    setZoomLevel((settings.zoomLevel || Config.DEFAULT_ZOOM_LEVEL) + Config.ZOOM_STEP);
}

export function zoomOut() {
    if (!AppState.currentManga) return;
    const settings = loadMangaSettings(AppState.currentManga.id);
    setZoomLevel((settings.zoomLevel || Config.DEFAULT_ZOOM_LEVEL) - Config.ZOOM_STEP);
}

export function resetZoom() {
    setZoomLevel(Config.DEFAULT_ZOOM_LEVEL);
}

// --- Applying Styles ---

export function applyCurrentZoom() {
    if (!AppState.currentManga || !DOM.imageContainer) return;

    const settings = loadMangaSettings(AppState.currentManga.id);
    const zoomLevel = settings.zoomLevel || Config.DEFAULT_ZOOM_LEVEL;
    const imageFit = settings.imageFit || Config.DEFAULT_IMAGE_FIT;
    const images = $$('img.manga-image', DOM.imageContainer);
    const containerWidth = DOM.imageContainer.clientWidth; // Get current container width

    images.forEach(img => {
        const originalWidth = parseFloat(img.dataset.originalWidth);
        const originalHeight = parseFloat(img.dataset.originalHeight);

        // Reset styles first
        img.style.width = '';
        img.style.height = '';
        img.style.maxWidth = ''; // Ensure max-width doesn't interfere unless using 'width' fit

        if (!originalWidth || !originalHeight) {
             // Fallback if dimensions aren't available (shouldn't happen often)
             img.style.maxWidth = `${100 * zoomLevel}%`;
             img.style.height = 'auto';
             return;
        }

        switch (imageFit) {
            case 'height':
                // Fit to viewport height
                img.style.height = `${window.innerHeight * zoomLevel}px`;
                img.style.width = 'auto';
                img.style.maxWidth = 'none';
                break;
            case 'width':
                // Fit to container width
                img.style.width = `${100 * zoomLevel}%`;
                // Apply max-width based on container size to prevent excessive scaling
                img.style.maxWidth = `${containerWidth * zoomLevel}px`;
                img.style.height = 'auto';
                break;
            case 'original':
            default:
                // Use original size scaled by zoom level
                img.style.width = `${originalWidth * zoomLevel}px`;
                img.style.height = 'auto';
                img.style.maxWidth = 'none';
                break;
        }
    });

    // Update the zoom level display in the sidebar
    updateZoomLevelDisplay(zoomLevel);
}

// Apply spacing between images
export function applySpacing() {
    if (!AppState.currentManga || !DOM.imageContainer) return;
    const settings = loadMangaSettings(AppState.currentManga.id);
    const spacing = settings.collapseSpacing ? 0 : (settings.spacingAmount ?? Config.DEFAULT_SPACING_AMOUNT); // Use nullish coalescing

    DOM.imageContainer.style.gap = `${spacing}px`;
}

// --- Initialization ---
export function initZoomManager() {
    // Apply initial zoom/spacing if viewer is already visible (e.g., on reload)
    if (AppState.currentView === 'viewer') {
        applyCurrentZoom();
        applySpacing();
    }
}