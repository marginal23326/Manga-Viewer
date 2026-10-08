import { type Shortcut, type ShortcutId, matchShortcut } from "./keymap";
import { ViewerState, toggleToolbarPin } from "@/state";
import { goToChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./chapter-nav";
import { resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import { isOverlayOpen } from "@/core/dom-utils";
import { navigateTo } from "./hash-route";
import { openSettings } from "@/settings";
import { reloadManga } from "./view-router";
import { stepImage } from "@/viewer/lightbox";
import { toggleAutoScroll } from "@/viewer/auto-scroll";
import { toggleFullScreen } from "@/core/fullscreen";
import { toggleTheme } from "./theme";

function isAvailable({ anywhere, lightbox }: Shortcut): boolean {
    if (ViewerState.lightboxIndex !== null) return lightbox === true;
    if (isOverlayOpen()) return false;
    return anywhere === true || ViewerState.session !== null;
}

export function initShortcuts(): void {
    const handlers = {
        escape: () => {
            if (!document.querySelector(":popover-open")) navigateTo({ name: "library" });
        },
        firstChapter: () => goToChapter(0),
        lastChapter: goToLastChapter,
        nextChapter: loadNextChapter,
        nextImage: () => stepImage(1),
        openSettings,
        previousChapter: loadPreviousChapter,
        previousImage: () => stepImage(-1),
        reloadManga: () => void reloadManga(),
        resetZoom,
        toggleAutoScroll,
        toggleFullscreen: toggleFullScreen,
        toggleTheme,
        toggleToolbarPin,
        zoomIn,
        zoomOut,
    } satisfies Record<ShortcutId, () => void>;

    document.addEventListener("keydown", (event) => {
        if ((event.target as Element | null)?.matches("input, textarea, select")) return;

        const shortcut = matchShortcut(event);
        if (!shortcut || !isAvailable(shortcut)) return;

        handlers[shortcut.id]();
        if (shortcut.id !== "escape") event.preventDefault();
    });
}
