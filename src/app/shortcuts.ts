import { type ShortcutDefinition, type ShortcutId, shortcutMetadata } from "./shortcut-metadata";
import { goToChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "@/viewer/chapter";
import { resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import type { Viewer } from "@/viewer/viewer";
import { ViewerState } from "@/state";
import { isOverlayOpen } from "@/core/dom-utils";
import { navigateTo } from "./hash-route";
import { openSettings } from "@/settings";
import { toggleAutoScroll as toggleAutoScrollFeature } from "@/viewer/auto-scroll";
import { toggleFullScreen } from "@/core/fullscreen";
import { toggleSidebarPin } from "./sidebar";
import { toggleTheme } from "./theme";

function handleEscape(): void {
    if (!isOverlayOpen() && ViewerState.currentMangaId !== null) {
        navigateTo({ name: "library" });
    }
}

interface ShortcutEntry extends ShortcutDefinition {
    handler: () => void;
}

// Shortcut Handling
function handleKeyDown(event: KeyboardEvent, shortcutByKey: Map<string, ShortcutEntry>): void {
    const targetTagName = (event.target as HTMLElement | null)?.tagName;
    const isInputFocused = targetTagName === "INPUT" || targetTagName === "TEXTAREA" || targetTagName === "SELECT";

    if (isInputFocused && event.key !== "Escape") {
        return;
    }

    let keyIdentifier = "";
    if (event.ctrlKey || event.metaKey) keyIdentifier += "Ctrl+";
    if (event.altKey) keyIdentifier += "Alt+";
    if (event.shiftKey) keyIdentifier += "Shift+";
    keyIdentifier += event.code;

    const shortcut = shortcutByKey.get(keyIdentifier);
    if (!shortcut) return;

    if (isOverlayOpen() && shortcut.id !== "escape") return;
    if ((shortcut.viewerOnly ?? true) && ViewerState.currentMangaId === null) return;

    shortcut.handler();

    if (event.key !== "Escape") {
        event.preventDefault();
    }
}

export function initShortcuts(viewer: Viewer): void {
    const shortcutHandlers = {
        escape: handleEscape,
        firstChapter: () => goToChapter(0),
        lastChapter: goToLastChapter,
        nextChapter: loadNextChapter,
        nextImage: () => viewer.stepImage(1),
        openSettings,
        previousChapter: loadPreviousChapter,
        previousImage: () => viewer.stepImage(-1),
        reloadManga: () => void viewer.reload(),
        resetZoom,
        toggleAutoScroll: toggleAutoScrollFeature,
        toggleFullscreen: toggleFullScreen,
        toggleSidebarPin,
        toggleTheme,
        zoomIn,
        zoomOut,
    } satisfies Record<ShortcutId, () => void>;

    const shortcutByKey = new Map<string, ShortcutEntry>();
    for (const shortcut of shortcutMetadata) {
        const entry: ShortcutEntry = { ...shortcut, handler: shortcutHandlers[shortcut.id] };
        for (const key of entry.keys) shortcutByKey.set(key, entry);
    }

    document.addEventListener("keydown", (event) => handleKeyDown(event, shortcutByKey));
}
