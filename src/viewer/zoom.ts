import { DEFAULT_MANGA_PROGRESS, ViewerState } from "@/state";
import type { Binding } from "@/core/binding";
import { clamp } from "@/core/utils";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.05;

function changeZoom(next: (current: number) => number): void {
    const progress = ViewerState.session?.progress;
    if (!progress) return;
    progress.update("zoomLevel", clamp(next(progress.zoomLevel), MIN_ZOOM, MAX_ZOOM));
}

export const zoomIn = (): void => changeZoom((zoom) => zoom + ZOOM_STEP);
export const zoomOut = (): void => changeZoom((zoom) => zoom - ZOOM_STEP);
export const resetZoom = (): void => changeZoom(() => DEFAULT_MANGA_PROGRESS.zoomLevel);

export const zoomPercent: Binding<number> = {
    set: (percent) => changeZoom(() => percent / 100),
    subscribe: (listener, signal) =>
        ViewerState.onChange(
            "session",
            (session) =>
                session?.progress.onChange("zoomLevel", (zoomLevel) => listener(Math.round(zoomLevel * 100)), {
                    immediate: true,
                }),
            { immediate: true, signal },
        ),
};
