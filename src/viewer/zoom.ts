import { CurrentProgress, DEFAULT_MANGA_PROGRESS } from "@/state";

const MIN_ZOOM = 0.1;
const ZOOM_STEP = 0.05;

function setZoomLevel(newZoomLevel: number): void {
    CurrentProgress.update("zoomLevel", Math.max(MIN_ZOOM, newZoomLevel));
}

export function zoomIn(): void {
    setZoomLevel(CurrentProgress.zoomLevel + ZOOM_STEP);
}

export function zoomOut(): void {
    setZoomLevel(CurrentProgress.zoomLevel - ZOOM_STEP);
}

export function resetZoom(): void {
    setZoomLevel(DEFAULT_MANGA_PROGRESS.zoomLevel);
}

export function formatZoomLevel(zoomLevel: number): string {
    return `${Math.round(zoomLevel * 100)}%`;
}
