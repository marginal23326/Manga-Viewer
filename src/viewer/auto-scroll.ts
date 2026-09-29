import { CurrentSettings, ViewerState } from "@/state";
import { isModalOpen, onModalVisibilityChange } from "@/components/modal";
import type { Binding } from "@/core/binding";
import { getActiveScrollAnchor } from "./virtualizer";

let rafId: number | null = null;
let lastTime = 0;
let lastScrollY = -1;
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
                stopLoop();
                ViewerState.update("autoScroll", "off");
                return;
            }
        }
    }

    lastTime = now;
    rafId = requestAnimationFrame(loop);
}

function startLoop(): boolean {
    if (rafId !== null) return true;
    if (!getActiveScrollAnchor() || !CurrentSettings.autoScrollSpeed || isModalOpen()) return false;

    lastTime = 0;
    pendingScroll = 0;
    lastScrollY = scrollY;
    rafId = requestAnimationFrame(loop);
    return true;
}

function stopLoop(): void {
    pendingScroll = 0;
    lastTime = 0;
    lastScrollY = -1;
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

export function toggleAutoScroll(): void {
    if (ViewerState.autoScroll === "running") {
        stopLoop();
        ViewerState.update("autoScroll", "off");
    } else if (startLoop()) {
        ViewerState.update("autoScroll", "running");
    }
}

function handleManualScroll(): void {
    if (rafId !== null && lastScrollY >= 0 && Math.abs(scrollY - lastScrollY) > 1) {
        stopLoop();
        ViewerState.update("autoScroll", "paused");
    }
}

export function initAutoScroll(): void {
    onModalVisibilityChange((open) => {
        if (open) stopLoop();
        else if (ViewerState.autoScroll === "running") startLoop();
    });

    addEventListener("scroll", handleManualScroll, { passive: true });
    ViewerState.onChange("currentMangaId", (mangaId) => {
        if (mangaId === null) {
            stopLoop();
            ViewerState.update("autoScroll", "off");
        }
    });
}

export const autoScrollRunning: Binding<boolean> = {
    set: toggleAutoScroll,
    subscribe: (listener, signal) =>
        ViewerState.onChange("autoScroll", (status) => listener(status === "running"), { immediate: true, signal }),
};
