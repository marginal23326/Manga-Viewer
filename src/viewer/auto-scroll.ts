import { CurrentSettings, PersistState, UIState } from "@/state";
import { createAbortScope } from "@/core/utils";
import { getActiveScrollAnchor } from "./virtualizer";
import { isModalOpen } from "@/components/modal";

let scrollInterval: ReturnType<typeof setInterval> | null = null;
const SCROLL_INTERVAL_MS = 20;
const AUTO_SCROLL_START_DELAY_MS = 100;

let isAutoScrollTick = false;
let isAutoScrolling = false;
const scrollScope = createAbortScope();

function doScroll(speed: number): void {
    // Convert px/sec to px per interval.
    const scrollAmount = speed * (SCROLL_INTERVAL_MS / 1000);
    isAutoScrollTick = true;
    scrollBy(0, scrollAmount);

    if (innerHeight + scrollY >= document.body.offsetHeight) {
        stopAutoScroll();
    }
}

function startAutoScroll(): void {
    if (scrollInterval != null) return;
    if (!getActiveScrollAnchor()) return;

    const speed = CurrentSettings.autoScrollSpeed;

    if (!CurrentSettings.autoScrollEnabled || !speed) {
        stopAutoScroll();
        return;
    }

    scrollInterval = setInterval(() => doScroll(speed), SCROLL_INTERVAL_MS);
    isAutoScrolling = true;
}

function stopAutoScroll(): void {
    if (scrollInterval != null) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        isAutoScrolling = false;
    }
}

export function toggleAutoScroll(): void {
    const enabled = !isAutoScrolling;
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
    if (isAutoScrolling) {
        stopAutoScroll();
    }
}

function applyAutoScroll(enabled: boolean): void {
    if (!enabled) stopAutoScroll();
    else if (!isModalOpen()) startAutoScroll();
}

function activateViewerScrollGuard(): void {
    const signal = scrollScope.renew();
    addEventListener("scroll", handleManualScroll, { passive: true, signal });
}

export function initAutoScroll(): void {
    CurrentSettings.onChange("autoScrollEnabled", applyAutoScroll);
    UIState.onChange("isModalOpen", (open) => {
        if (!open) applyAutoScroll(CurrentSettings.autoScrollEnabled);
    });
    CurrentSettings.onChange("autoScrollSpeed", () => {
        if (isAutoScrolling) {
            stopAutoScroll();
            startAutoScroll();
        }
    });

    PersistState.onChange(
        "currentView",
        (view) => {
            if (view === "viewer") activateViewerScrollGuard();
            else {
                scrollScope.abort();
                stopAutoScroll();
            }
        },
        { immediate: true },
    );
}
