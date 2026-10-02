import { CurrentProgress, DEFAULT_MANGA_PROGRESS } from "@/state";
import type { Binding } from "@/core/binding";
import { clamp } from "@/core/utils";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.05;

function setZoomLevel(newZoomLevel: number): void {
    CurrentProgress.update("zoomLevel", clamp(newZoomLevel, MIN_ZOOM, MAX_ZOOM));
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

export const zoomPercent: Binding<number> = {
    set: (percent) => setZoomLevel(percent / 100),
    subscribe: (listener, signal) =>
        CurrentProgress.onChange("zoomLevel", (zoomLevel) => listener(Math.round(zoomLevel * 100)), {
            immediate: true,
            signal,
        }),
};
