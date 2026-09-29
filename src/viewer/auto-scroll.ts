import { CurrentSettings, ViewerState } from "@/state";
import { isModalOpen, onModalVisibilityChange } from "@/components/modal";
import { getActiveScrollAnchor } from "./virtualizer";

export type AutoScrollStatus = "off" | "running" | "paused";

let status: AutoScrollStatus = "off";
const statusListeners = new Set<(status: AutoScrollStatus) => void>();

export function onAutoScrollStatusChange(listener: (status: AutoScrollStatus) => void): void {
    statusListeners.add(listener);
}

function setStatus(next: AutoScrollStatus): void {
    if (next === status) return;
    status = next;
    for (const listener of statusListeners) listener(status);
}

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
                setStatus("off");
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
    if (status === "running") {
        stopLoop();
        setStatus("off");
    } else if (startLoop()) {
        setStatus("running");
    }
}

function handleManualScroll(): void {
    if (rafId !== null && lastScrollY >= 0 && Math.abs(scrollY - lastScrollY) > 1) {
        stopLoop();
        setStatus("paused");
    }
}

export function initAutoScroll(): void {
    onModalVisibilityChange((open) => {
        if (open) stopLoop();
        else if (status === "running") startLoop();
    });

    addEventListener("scroll", handleManualScroll, { passive: true });
    ViewerState.onChange("currentMangaId", (mangaId) => {
        if (mangaId === null) {
            stopLoop();
            setStatus("off");
        }
    });
}
