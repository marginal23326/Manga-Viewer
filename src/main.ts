import "./css/styles.css";

import { initAutoScroll } from "@/viewer/auto-scroll";
import { initChapterViewer } from "@/viewer/chapter";
import { initHomePageUI } from "@/library/home-page-ui";
import { initLightbox } from "@/viewer/lightbox";
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
    initShortcuts();
    initProgressBar();
    initAutoScroll();
    initScrollPosition();
    initScrubber();
    initLightbox();
    initChapterViewer();
    initHomePageUI();
    initViewerState();
}

initTheme();

const password = import.meta.env.VITE_PASSWORD || "";
if (password) {
    initPasswordPrompt(password, mountApp);
} else {
    mountApp();
}
