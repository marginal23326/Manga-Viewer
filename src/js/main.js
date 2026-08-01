import "../css/styles.css";
import "smoothscroll-for-websites";

import { UIState, loadPersistState } from "./state/State";
import { hideSpinner, showSpinner } from "./core/Utils";
import Config from "./core/Config";
import { initHomePageUI } from "./ui/HomePageUI";
import { initImageManager } from "./features/ImageManager";
import { initNavigation } from "./features/NavigationManager";
import { initPasswordPrompt } from "./components/PasswordPrompt";
import { initScrubberManager } from "./features/ScrubberManager";
import { initShortcuts } from "./ui/Shortcuts";
import { initSidebar } from "./features/SidebarManager";
import { initTheme } from "./ui/ThemeManager";
import { initViewerState } from "./ui/ViewerUI";
import { initZoomManager } from "./features/ZoomManager";

history.scrollRestoration = "manual";

function initializeApp() {
    showSpinner();

    // Initialize managers and UI components
    initSidebar();
    initNavigation();
    initImageManager();
    initZoomManager();
    initScrubberManager();
    initHomePageUI();
    initViewerState();

    hideSpinner();
}

function start() {
    loadPersistState();
    initTheme();
    initShortcuts();

    if (Config.PASSWORD && !UIState.isPasswordVerified) {
        initPasswordPrompt(Config.PASSWORD, initializeApp);
    } else {
        initializeApp();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
    start();
}
