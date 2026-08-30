import "./css/styles.css";
import "smoothscroll-for-websites";

import "@/app/theme";
import "@/app/shortcuts";
import "@/viewer/chapter";
import "@/viewer/scroll-position";

import { hideSpinner, showSpinner } from "@/core/dom-utils";
import Config from "@/core/config";
import { UIState } from "@/state";
import { initAutoScroll } from "@/viewer/auto-scroll";
import { initHomePageUI } from "@/library/home-page-ui";
import { initNavigation } from "@/viewer/nav-bar";
import { initPasswordPrompt } from "@/app/password-prompt";
import { initProgressBar } from "@/viewer/progress-bar";
import { initSidebar } from "@/app/sidebar";
import { initViewerState } from "@/app/view-router";

history.scrollRestoration = "manual";

function mountApp(): void {
    showSpinner();

    initSidebar();
    initNavigation();
    initProgressBar();
    initAutoScroll();
    initHomePageUI();
    initViewerState();

    hideSpinner();
}

if (Config.PASSWORD && !UIState.isPasswordVerified) {
    initPasswordPrompt(Config.PASSWORD, mountApp);
} else {
    mountApp();
}
