import { type Shortcut, type ShortcutId, matchShortcut } from "./keymap";
import { ViewerState, toggleToolbarPin } from "@/state";
import { goToChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "@/viewer/chapter";
import { resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import type { Viewer } from "@/viewer/viewer";
import { isOverlayOpen } from "@/core/dom-utils";
import { navigateTo } from "./hash-route";
import { openSettings } from "@/settings";
import { toggleAutoScroll } from "@/viewer/auto-scroll";
import { toggleFullScreen } from "@/core/fullscreen";
import { toggleTheme } from "./theme";

function isAvailable({ anywhere, lightbox }: Shortcut, viewer: Viewer): boolean {
    if (viewer.isLightboxOpen()) return lightbox === true;
    if (isOverlayOpen()) return false;
    return anywhere === true || ViewerState.currentMangaId !== null;
}

export function initShortcuts(viewer: Viewer): void {
    const handlers = {
        escape: () => {
            if (!document.querySelector(":popover-open")) navigateTo({ name: "library" });
        },
        firstChapter: () => goToChapter(0),
        lastChapter: goToLastChapter,
        nextChapter: loadNextChapter,
        nextImage: () => viewer.stepImage(1),
        openSettings,
        previousChapter: loadPreviousChapter,
        previousImage: () => viewer.stepImage(-1),
        reloadManga: () => void viewer.reload(),
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
        if (!shortcut || !isAvailable(shortcut, viewer)) return;

        handlers[shortcut.id]();
        if (shortcut.id !== "escape") event.preventDefault();
    });
}
