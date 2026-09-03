import "./css/styles.css";

import Config from "@/core/config";
import { UIState } from "@/state";
import { initAutoScroll } from "@/viewer/auto-scroll";
import { initHomePageUI } from "@/library/home-page-ui";
import { initNavigation } from "@/viewer/nav-bar";
import { initPasswordPrompt } from "@/app/password-prompt";
import { initProgressBar } from "@/viewer/progress-bar";
import { initScrollPosition } from "@/viewer/scroll-position";
import { initScrubber } from "@/viewer/scrubber";
import { initShortcuts } from "@/app/shortcuts";
import { initSidebar } from "@/app/sidebar";
import { initTheme } from "@/app/theme";
import { initViewerState } from "@/app/view-router";

history.scrollRestoration = "manual";

function mountApp(): void {
    initSidebar();
    initNavigation();
    initProgressBar();
    initAutoScroll();
    initScrollPosition();
    initScrubber();
    initHomePageUI();
    initViewerState();
}

initTheme();
initShortcuts();

if (Config.PASSWORD && !UIState.isPasswordVerified) {
    initPasswordPrompt(Config.PASSWORD, mountApp);
} else {
    mountApp();
}
