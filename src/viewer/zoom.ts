import { CurrentProgress, DEFAULT_MANGA_PROGRESS } from "@/state";
import Config from "@/core/config";

function setZoomLevel(newZoomLevel: number): void {
    CurrentProgress.update("zoomLevel", Math.max(Config.MIN_ZOOM, newZoomLevel));
}

export function zoomIn(): void {
    setZoomLevel(CurrentProgress.zoomLevel + Config.ZOOM_STEP);
}

export function zoomOut(): void {
    setZoomLevel(CurrentProgress.zoomLevel - Config.ZOOM_STEP);
}

export function resetZoom(): void {
    setZoomLevel(DEFAULT_MANGA_PROGRESS.zoomLevel);
}

export function formatZoomLevel(zoomLevel: number): string {
    return `${Math.round(zoomLevel * 100)}%`;
}
