import { CurrentSettings, UIState } from "@/state";
import { getActiveScrollAnchor } from "./virtualizer";
import { isModalOpen } from "@/components/modal";
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
    if (!getActiveScrollAnchor()) return;

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
    const enabled = !UIState.isAutoScrolling;
    if (!CurrentSettings.update("autoScrollEnabled", enabled)) applyAutoScroll(enabled);
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

function applyAutoScroll(enabled: boolean): void {
    if (!enabled) stopAutoScroll();
    else if (!isModalOpen()) startAutoScroll();
}

CurrentSettings.onChange("autoScrollEnabled", applyAutoScroll);
onAppEvent("lastModalClosed", () => applyAutoScroll(CurrentSettings.autoScrollEnabled));
CurrentSettings.onChange("autoScrollSpeed", () => {
    if (UIState.isAutoScrolling) {
        stopAutoScroll();
        startAutoScroll();
    }
});

onAppEvent("viewChanged", ({ detail }) => {
    if (detail.showViewer) {
        scrollController = renewController(scrollController);
        onAppEvent("viewerScroll", handleManualScroll, { signal: scrollController.signal });
    } else {
        scrollController.abort();
        stopAutoScroll();
    }
});
