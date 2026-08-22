import "./css/styles.css";
import "smoothscroll-for-websites";

import { UIState, initCurrentSettings, loadPersistState } from "@/state";
import { hideSpinner, showSpinner } from "@/core/dom-utils";
import Config from "@/core/config";
import { initChapterViewer } from "@/viewer/chapter";
import { initHomePageUI } from "@/library/home-page-ui";
import { initNavigation } from "@/viewer/nav-bar";
import { initPasswordPrompt } from "@/app/password-prompt";
import { initShortcuts } from "@/app/shortcuts";
import { initSidebar } from "@/app/sidebar";
import { initTheme } from "@/app/theme";
import { initViewerState } from "@/app/view-router";

history.scrollRestoration = "manual";

function initializeApp(): void {
    showSpinner();

    // Initialize managers and UI components
    initSidebar();
    initNavigation();
    initChapterViewer();
    initHomePageUI();
    initViewerState();

    hideSpinner();
}

function start(): void {
    loadPersistState();
    initCurrentSettings();
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
