import { CurrentSettings, PersistState, UIState } from "@/state";
import { getActiveScrollAnchor } from "./virtualizer";
import { isModalOpen } from "@/components/modal";

let rafId: number | null = null;
let lastTime = 0;
let lastScrollY = -1;
const AUTO_SCROLL_START_DELAY_MS = 100;
let pendingScroll = 0;

function loop(now: number): void {
    if (rafId === null) return;

    if (lastTime > 0) {
        const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
        pendingScroll += CurrentSettings.autoScrollSpeed * deltaSec;
        const px = Math.trunc(pendingScroll);

        if (px > 0) {
            pendingScroll -= px;
            scrollBy(0, px);
            lastScrollY = scrollY;

            if (innerHeight + scrollY >= document.documentElement.scrollHeight) {
                stopAutoScroll();
                return;
            }
        }
    }

    lastTime = now;
    rafId = requestAnimationFrame(loop);
}

function startAutoScroll(): void {
    if (rafId !== null || !getActiveScrollAnchor()) return;
    if (!CurrentSettings.autoScrollEnabled || !CurrentSettings.autoScrollSpeed) {
        stopAutoScroll();
        return;
    }

    lastTime = 0;
    pendingScroll = 0;
    lastScrollY = scrollY;
    rafId = requestAnimationFrame(loop);
}

function stopAutoScroll(): void {
    pendingScroll = 0;
    lastTime = 0;
    lastScrollY = -1;
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

export function toggleAutoScroll(): void {
    const enabled = rafId === null;
    if (!CurrentSettings.update("autoScrollEnabled", enabled)) applyAutoScroll(enabled);
}

export function resumeAutoScrollIfEnabled(): void {
    if (CurrentSettings.autoScrollEnabled) {
        setTimeout(() => startAutoScroll(), AUTO_SCROLL_START_DELAY_MS);
    }
}

function handleManualScroll(): void {
    if (rafId !== null && lastScrollY >= 0 && Math.abs(scrollY - lastScrollY) > 1) {
        stopAutoScroll();
    }
}

function applyAutoScroll(enabled: boolean): void {
    if (!enabled) stopAutoScroll();
    else if (!isModalOpen()) startAutoScroll();
}

export function initAutoScroll(): void {
    CurrentSettings.onChange("autoScrollEnabled", applyAutoScroll);
    UIState.onChange("isModalOpen", (open) => {
        if (!open) applyAutoScroll(CurrentSettings.autoScrollEnabled);
    });

    addEventListener("scroll", handleManualScroll, { passive: true });
    PersistState.onChange("currentView", (view) => {
        if (view !== "viewer") stopAutoScroll();
    });
}
