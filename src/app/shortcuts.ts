import { PersistState, UIState } from "@/state";
import { type ShortcutDefinition, type ShortcutId, shortcutMetadata } from "./shortcut-metadata";
import { closeLightbox, isLightboxOpen } from "@/viewer/lightbox";
import {
    goToFirstChapter,
    goToLastChapter,
    loadNextChapter,
    loadPreviousChapter,
    navigateImage,
    reloadCurrentChapter,
} from "@/viewer/chapter";
import { resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import { isModalOpen } from "@/components/modal";
import { openSettings } from "@/settings";
import { returnToHome } from "./view-router";
import { toggleAutoScroll as toggleAutoScrollFeature } from "@/viewer/auto-scroll";
import { toggleFullScreen } from "@/core/fullscreen";
import { toggleSidebarPin } from "./sidebar";
import { toggleTheme } from "./theme";

function handleEscape(): void {
    if (isLightboxOpen()) {
        closeLightbox();
        return;
    }
    if (!isModalOpen() && UIState.isPasswordVerified && PersistState.currentView === "viewer") {
        returnToHome();
    }
}

const shortcutHandlers = {
    escape: handleEscape,
    firstChapter: goToFirstChapter,
    lastChapter: goToLastChapter,
    nextChapter: loadNextChapter,
    nextImage: () => navigateImage(1),
    openSettings,
    previousChapter: loadPreviousChapter,
    previousImage: () => navigateImage(-1),
    reloadChapter: reloadCurrentChapter,
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
    if (event.shiftKey) keyIdentifier += "Shift+";
    keyIdentifier += event.key;

    const shortcut = shortcuts.find((sc) => sc.keys.includes(keyIdentifier));
    if (!shortcut) return;

    if (!UIState.isPasswordVerified && shortcut.allowBeforeVerified !== true) {
        return;
    }
    if (UIState.isPasswordVerified && shortcut.viewerOnly && PersistState.currentView !== "viewer") {
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
