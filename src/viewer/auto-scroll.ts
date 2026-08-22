import { CurrentSettings, UIState } from "@/state";
import { getMangaImages } from "@/core/dom-utils";
import { onAppEvent } from "@/core/app-events";
import { renewController } from "@/core/utils";

let scrollInterval: ReturnType<typeof setInterval> | null = null;
const SCROLL_INTERVAL_MS = 20;
const AUTO_SCROLL_START_DELAY_MS = 100;

let isAutoScrollTick = false;
let scrollController = new AbortController();

function doScroll(speed: number): void {
    // Convert px/sec to px per interval.
    const scrollAmount = speed * (SCROLL_INTERVAL_MS / 1000);
    isAutoScrollTick = true;
    window.scrollBy(0, scrollAmount);

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        stopAutoScroll();
    }
}

export function startAutoScroll(): void {
    if (scrollInterval != null) return;
    if (getMangaImages().length === 0) return;

    const speed = CurrentSettings.autoScrollSpeed;

    if (!CurrentSettings.autoScrollEnabled || !speed) {
        stopAutoScroll();
        return;
    }

    scrollInterval = setInterval(() => doScroll(speed), SCROLL_INTERVAL_MS);
    UIState.update("isAutoScrolling", true);
}

export function stopAutoScroll(): void {
    if (scrollInterval != null) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        UIState.update("isAutoScrolling", false);
    }
}

export function toggleAutoScroll(): void {
    const starting = !UIState.isAutoScrolling;
    CurrentSettings.update("autoScrollEnabled", starting);
    if (starting) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

export function resumeAutoScrollIfEnabled(): void {
    if (CurrentSettings.autoScrollEnabled) {
        setTimeout(() => startAutoScroll(), AUTO_SCROLL_START_DELAY_MS);
    }
}

function handleManualScroll(): void {
    if (isAutoScrollTick) {
        isAutoScrollTick = false;
        return;
    }
    if (UIState.isAutoScrolling) {
        stopAutoScroll();
    }
}

// The enabled toggle starts/stops scrolling; speed changes restart a running
// scroll with the new speed.
CurrentSettings.onChange("autoScrollEnabled", (enabled) => (enabled ? startAutoScroll() : stopAutoScroll()));
CurrentSettings.onChange("autoScrollSpeed", () => {
    if (UIState.isAutoScrolling) {
        stopAutoScroll();
        startAutoScroll();
    }
});

export function initAutoScrollListener(): void {
    scrollController = renewController(scrollController);
    onAppEvent("viewerScroll", handleManualScroll, { signal: scrollController.signal });
}

export function destroyAutoScrollListener(): void {
    scrollController.abort();
    stopAutoScroll();
}
