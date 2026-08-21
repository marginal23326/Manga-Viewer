import { UIState, getCurrentSettings, updateCurrentSettings } from "@/state";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import { getMangaImages } from "@/core/dom-utils";

let scrollInterval: ReturnType<typeof setInterval> | null = null;
const SCROLL_INTERVAL_MS = 20;
const AUTO_SCROLL_START_DELAY_MS = 100;

let isAutoScrollTick = false;

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

    const settings = getCurrentSettings();
    const speed = settings.autoScrollSpeed;

    if (!settings.autoScrollEnabled || !speed) {
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
    const newStatus = !UIState.isAutoScrolling;

    updateCurrentSettings({ autoScrollEnabled: newStatus });

    if (newStatus) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

export function resumeAutoScrollIfEnabled(): void {
    const settings = getCurrentSettings();
    if (settings.autoScrollEnabled) {
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

export function initAutoScrollListener(): void {
    onAppEvent("viewerScroll", handleManualScroll);
}

export function destroyAutoScrollListener(): void {
    offAppEvent("viewerScroll", handleManualScroll);
    stopAutoScroll();
}
