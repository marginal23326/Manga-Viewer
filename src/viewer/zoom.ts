import { $, setText } from "@/core/dom-utils";
import { CurrentSettings, DEFAULT_MANGA_SETTINGS } from "@/state";
import Config from "@/core/config";

function setZoomLevel(newZoomLevel: number): void {
    CurrentSettings.update("zoomLevel", Math.max(Config.MIN_ZOOM, newZoomLevel));
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

export function formatZoomLevel(zoomLevel: number): string {
    return `${Math.round(zoomLevel * 100)}%`;
}

function syncZoomDisplay(): void {
    setText($("#zoom-level-display"), formatZoomLevel(CurrentSettings.zoomLevel));
}

CurrentSettings.onChange("zoomLevel", syncZoomDisplay);
