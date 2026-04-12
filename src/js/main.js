import "../css/styles.css";
import "smoothscroll-for-websites";

import { initPasswordPrompt } from "./components/PasswordPrompt";
import Config from "./core/Config";
import { cacheDOMelements } from "./core/DOMUtils";
import { UIState, loadPersistState } from "./core/State";
import { showSpinner, hideSpinner } from "./core/Utils";
import { initChapterManager } from "./features/ChapterManager";
import { initImageManager } from "./features/ImageManager";
import { initNavigation } from "./features/NavigationManager";
import { initScrubberManager } from "./features/ScrubberManager";
import { initSidebar } from "./features/SidebarManager";
import { initZoomManager } from "./features/ZoomManager";
import { initAppLayout } from "./ui/AppLayout";
import { initHomePageUI } from "./ui/HomePageUI";
import { initShortcuts } from "./ui/Shortcuts";
import { initTheme } from "./ui/ThemeManager";
import { initViewerState } from "./ui/ViewerUI";

history.scrollRestoration = "manual";

async function initializeApp() {
    showSpinner();

    // Initialize managers and UI components
    initAppLayout();
    initSidebar();
    initNavigation();
    initImageManager();
    initZoomManager();
    initChapterManager();
    initScrubberManager();
    initHomePageUI();
    initViewerState();

    hideSpinner();
}

function start() {
    loadPersistState();
    cacheDOMelements();
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
