import { PersistState, UIState } from "@/state/state";
import { type ShortcutDefinition, shortcutMetadata } from "./shortcut-metadata";
import {
    goToFirstChapter,
    goToLastChapter,
    loadNextChapter,
    loadPreviousChapter,
    navigateImage,
    reloadCurrentChapter,
} from "@/features/image-manager";
import { resetZoom, zoomIn, zoomOut } from "@/features/zoom-manager";
import { $ } from "@/core/dom-utils";
import { cycleSidebarMode } from "@/features/sidebar-manager";
import { openSettings } from "@/features/settings-manager";
import { returnToHome } from "./viewer-ui";
import { toggleAutoScroll as toggleAutoScrollFeature } from "@/features/auto-scroll";
import { toggleFullScreen } from "@/core/fullscreen";
import { toggleTheme } from "@/features/theme-manager";

function handleEscape(): void {
    const openModal = $('#modal-container > div[role="dialog"]');
    if (!openModal && UIState.isPasswordVerified && PersistState.currentView === "viewer") {
        returnToHome();
    }
}

const shortcutHandlers: Record<string, () => void> = {
    cycleSidebarMode,
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
    toggleTheme,
    zoomIn,
    zoomOut,
};

interface ShortcutEntry extends ShortcutDefinition {
    handler: () => void;
}

const shortcuts: ShortcutEntry[] = shortcutMetadata
    .map((shortcut) => ({ ...shortcut, handler: shortcutHandlers[shortcut.id] }))
    .filter((shortcut): shortcut is ShortcutEntry => Boolean(shortcut.handler));

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
    event.preventDefault();
}

export function initShortcuts(): void {
    document.addEventListener("keydown", handleKeyDown);
}
