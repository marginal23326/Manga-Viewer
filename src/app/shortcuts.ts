import { type ShortcutDefinition, type ShortcutId, shortcutMetadata } from "./shortcut-metadata";
import { UIState, ViewerState } from "@/state";
import { closeLightbox, isLightboxOpen } from "@/viewer/lightbox";
import {
    goToChapter,
    goToLastChapter,
    loadNextChapter,
    loadPreviousChapter,
    navigateImage,
    reloadManga,
} from "@/viewer/chapter";
import { resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import { isModalOpen } from "@/components/modal";
import { navigateTo } from "./hash-route";
import { openSettings } from "@/settings";
import { toggleAutoScroll as toggleAutoScrollFeature } from "@/viewer/auto-scroll";
import { toggleFullScreen } from "@/core/fullscreen";
import { toggleSidebarPin } from "./sidebar";
import { toggleTheme } from "./theme";

function handleEscape(): void {
    if (isLightboxOpen()) {
        closeLightbox();
        return;
    }
    if (!isModalOpen() && UIState.isPasswordVerified && ViewerState.currentMangaId !== null) {
        navigateTo({ name: "library" });
    }
}

const shortcutHandlers = {
    escape: handleEscape,
    firstChapter: () => goToChapter(0),
    lastChapter: goToLastChapter,
    nextChapter: loadNextChapter,
    nextImage: () => navigateImage(1),
    openSettings,
    previousChapter: loadPreviousChapter,
    previousImage: () => navigateImage(-1),
    reloadManga: () => void reloadManga(),
    resetZoom,
    toggleAutoScroll: toggleAutoScrollFeature,
    toggleFullscreen: toggleFullScreen,
    toggleSidebarPin,
    toggleTheme,
    zoomIn,
    zoomOut,
} satisfies Record<ShortcutId, () => void>;

interface ShortcutEntry extends ShortcutDefinition {
    handler: () => void;
}

const shortcuts: ShortcutEntry[] = shortcutMetadata.map((shortcut) => ({
    ...shortcut,
    handler: shortcutHandlers[shortcut.id],
}));

// Shortcut Handling
function handleKeyDown(event: KeyboardEvent): void {
    const targetTagName = (event.target as HTMLElement | null)?.tagName;
    const isInputFocused = targetTagName === "INPUT" || targetTagName === "TEXTAREA" || targetTagName === "SELECT";

    if (isInputFocused && event.key !== "Escape") {
        return;
    }

    let keyIdentifier = "";
    if (event.ctrlKey || event.metaKey) keyIdentifier += "Ctrl+";
    if (event.altKey) keyIdentifier += "Alt+";
    if (event.shiftKey && event.key !== "+") keyIdentifier += "Shift+";
    keyIdentifier += event.key;

    const shortcut = shortcuts.find((sc) => sc.keys.includes(keyIdentifier));
    if (!shortcut) return;

    if (UIState.isPasswordVerified) {
        if (isModalOpen() && shortcut.id !== "escape") return;
        if (shortcut.viewerOnly && ViewerState.currentMangaId === null) return;
    } else if (shortcut.allowBeforeVerified !== true) {
        return;
    }

    shortcut.handler();

    if (event.key !== "Escape") {
        event.preventDefault();
    }
}

export function initShortcuts(): void {
    document.addEventListener("keydown", handleKeyDown);
}
