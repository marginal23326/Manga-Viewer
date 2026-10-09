import { CurrentSettings, DEFAULT_MANGA_SETTINGS } from "@/state";
import type { Binding } from "@/core/binding";
import { clamp } from "@/core/utils";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.05;

function changeZoom(next: (current: number) => number): void {
    CurrentSettings.update("zoomLevel", clamp(next(CurrentSettings.zoomLevel), MIN_ZOOM, MAX_ZOOM));
}

export const zoomIn = (): void => changeZoom((zoom) => zoom + ZOOM_STEP);
export const zoomOut = (): void => changeZoom((zoom) => zoom - ZOOM_STEP);
export const resetZoom = (): void => changeZoom(() => DEFAULT_MANGA_SETTINGS.zoomLevel);

export const zoomPercent: Binding<number> = {
    set: (percent) => changeZoom(() => percent / 100),
    subscribe: (listener, signal) =>
        CurrentSettings.onChange("zoomLevel", (zoomLevel) => listener(Math.round(zoomLevel * 100)), {
            immediate: true,
            signal,
        }),
};
