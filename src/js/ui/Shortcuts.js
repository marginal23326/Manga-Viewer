import { toggleFullScreen } from "../core/Fullscreen";
import { PersistState, UIState } from "../core/State";
import { toggleAutoScroll as toggleAutoScrollFeature } from "../features/AutoScroll";
import {
    loadNextChapter,
    loadPreviousChapter,
    goToFirstChapter,
    goToLastChapter,
    reloadCurrentChapter,
    navigateImage,
} from "../features/ImageManager";
import { openSettings } from "../features/SettingsManager";
import { cycleSidebarMode } from "../features/SidebarManager";
import { zoomIn, zoomOut, resetZoom } from "../features/ZoomManager";

import { shortcutMetadata } from "./ShortcutMetadata";
import { toggleTheme } from "./ThemeManager";
import { returnToHome } from "./ViewerUI";

const shortcutHandlers = {
    nextImage: () => navigateImage(1),
    previousImage: () => navigateImage(-1),
    nextChapter: loadNextChapter,
    previousChapter: loadPreviousChapter,
    firstChapter: goToFirstChapter,
    lastChapter: goToLastChapter,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen: toggleFullScreen,
    reloadChapter: reloadCurrentChapter,
    toggleAutoScroll: toggleAutoScrollFeature,
    toggleTheme,
    openSettings,
    escape: handleEscape,
    cycleSidebarMode,
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
    const openModal = document.querySelector('#modal-container > div[role="dialog"]');
    if (!openModal && UIState.isPasswordVerified && PersistState.currentView === "viewer") {
        returnToHome();
    }
}

export function initShortcuts() {
    document.addEventListener("keydown", handleKeyDown);
}
