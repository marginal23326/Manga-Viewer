import { CurrentSettings, ViewerState } from "@/state";
import { isOverlayOpen } from "@/core/dom-utils";

export function toggleAutoScroll(): void {
    ViewerState.update("autoScroll", !ViewerState.autoScroll);
}

export function initAutoScroll(): void {
    let rafId = 0;
    let lastTime = 0;
    let lastScrollY = 0;
    let pendingScroll = 0;

    function loop(now: number): void {
        const paused = isOverlayOpen();

        if (lastTime > 0 && !paused) {
            const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
            pendingScroll += CurrentSettings.autoScrollSpeed * deltaSec;
            const px = Math.trunc(pendingScroll);

            if (px > 0) {
                pendingScroll -= px;
                scrollBy(0, px);
                lastScrollY = scrollY;

                if (innerHeight + scrollY >= document.documentElement.scrollHeight) {
                    ViewerState.update("autoScroll", false);
                    return;
                }
            }
        }

        lastTime = paused ? 0 : now;
        rafId = requestAnimationFrame(loop);
    }

    ViewerState.onChange("autoScroll", (running) => {
        cancelAnimationFrame(rafId);
        if (!running) return;

        lastTime = 0;
        pendingScroll = 0;
        lastScrollY = scrollY;
        rafId = requestAnimationFrame(loop);
    });

    ViewerState.onChange("currentMangaId", (mangaId) => {
        if (mangaId === null) ViewerState.update("autoScroll", false);
    });

    addEventListener(
        "scroll",
        () => {
            if (ViewerState.autoScroll && Math.abs(scrollY - lastScrollY) > 1) ViewerState.update("autoScroll", false);
        },
        { passive: true },
    );
}
