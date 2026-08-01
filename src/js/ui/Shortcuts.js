import { PersistState, UIState } from "../state/State";
import {
    goToFirstChapter,
    goToLastChapter,
    loadNextChapter,
    loadPreviousChapter,
    navigateImage,
    reloadCurrentChapter,
} from "../features/ImageManager";
import { resetZoom, zoomIn, zoomOut } from "../features/ZoomManager";
import { $ } from "../core/DOMUtils";
import { cycleSidebarMode } from "../features/SidebarManager";
import { openSettings } from "../features/SettingsManager";
import { returnToHome } from "./ViewerUI";
import { shortcutMetadata } from "./ShortcutMetadata";
import { toggleAutoScroll as toggleAutoScrollFeature } from "../features/AutoScroll";
import { toggleFullScreen } from "../core/Fullscreen";
import { toggleTheme } from "./ThemeManager";

const shortcutHandlers = {
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

const shortcuts = shortcutMetadata.map((shortcut) => ({
    ...shortcut,
    handler: shortcutHandlers[shortcut.id],
}));

// Shortcut Handling
function handleKeyDown(event) {
    const targetTagName = event.target.tagName;
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

function handleEscape() {
    const openModal = $('#modal-container > div[role="dialog"]');
    if (!openModal && UIState.isPasswordVerified && PersistState.currentView === "viewer") {
        returnToHome();
    }
}

export function initShortcuts() {
    document.addEventListener("keydown", handleKeyDown);
}
