import "./css/styles.css";
import "smoothscroll-for-websites";

import { UIState, loadPersistState } from "@/state/state";
import { hideSpinner, showSpinner } from "@/core/utils";
import Config from "@/core/config";
import { initHomePageUI } from "@/ui/home-page-ui";
import { initImageManager } from "@/features/image-manager";
import { initNavigation } from "@/features/navigation-manager";
import { initPasswordPrompt } from "@/components/password-prompt";
import { initScrubberManager } from "@/features/scrubber-manager";
import { initShortcuts } from "@/ui/shortcuts";
import { initSidebar } from "@/features/sidebar-manager";
import { initTheme } from "@/features/theme-manager";
import { initViewerState } from "@/ui/viewer-ui";
import { initZoomManager } from "@/features/zoom-manager";

history.scrollRestoration = "manual";

function initializeApp(): void {
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

function start(): void {
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
