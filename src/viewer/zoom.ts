import { $, DOM, getMangaImages, setText } from "@/core/dom-utils";
import { CurrentSettings, DEFAULT_MANGA_SETTINGS, PersistState } from "@/state";
import Config from "@/core/config";
import type { ImageFit } from "@/types";
import { emitAppEvent } from "@/core/app-events";

// --- Zoom Actions ---

function setZoomLevel(newZoomLevel: number): void {
    if (!PersistState.currentMangaId) return;

    const clampedZoom = Math.max(Config.MIN_ZOOM, newZoomLevel);
    if (CurrentSettings.zoomLevel === clampedZoom) return;

    const viewportHeight = window.innerHeight;
    const oldScrollHeight = document.documentElement.scrollHeight;
    const oldScrollTop = window.scrollY;
    const scrollRatio = oldScrollHeight > viewportHeight ? oldScrollTop / (oldScrollHeight - viewportHeight) : 0;

    // Styles are applied by the zoomLevel subscription below.
    CurrentSettings.update("zoomLevel", clampedZoom);

    requestAnimationFrame(() => {
        const newScrollHeight = document.documentElement.scrollHeight;
        const newScrollTop = newScrollHeight > viewportHeight ? scrollRatio * (newScrollHeight - viewportHeight) : 0;
        window.scrollTo({
            top: Math.round(newScrollTop),
        });
    });
}

export function zoomIn(): void {
    setZoomLevel(CurrentSettings.zoomLevel + Config.ZOOM_STEP);
}

export function zoomOut(): void {
    setZoomLevel(CurrentSettings.zoomLevel - Config.ZOOM_STEP);
}

export function resetZoom(): void {
    setZoomLevel(DEFAULT_MANGA_SETTINGS.zoomLevel);
}

// --- Page Layout ---

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

// --- Live Settings Subscriptions ---

function refreshPageStyles(): void {
    if (!DOM.imageContainer) return;
    const { imageContainer } = DOM;

    const { imageFit, zoomLevel } = CurrentSettings;
    applyPageStylesToImages(getMangaImages(), imageFit, zoomLevel, imageContainer.clientWidth);

    setText($("#zoom-level-display"), `${Math.round(zoomLevel * 100)}%`);
    emitAppEvent("pageSizingChanged");
}

function applySpacing(): void {
    if (!DOM.imageContainer) return;
    const { collapseSpacing, spacingAmount } = CurrentSettings;

    DOM.imageContainer.style.gap = `${collapseSpacing ? 0 : spacingAmount}px`;
    emitAppEvent("pageSizingChanged");
}

CurrentSettings.onChange("imageFit", refreshPageStyles);
CurrentSettings.onChange("zoomLevel", refreshPageStyles);
CurrentSettings.onChange("collapseSpacing", applySpacing);
CurrentSettings.onChange("spacingAmount", applySpacing);

export function initPageLayout(): void {
    applySpacing();
    refreshPageStyles();
}
