import { UIState } from "../core/State";

import { getCurrentSettings, updateSettings } from "../core/MangaSettings";
import { withCurrentManga } from "../core/MangaLibrary";
import { debouncedSaveScroll } from "../core/ViewerScroll";

let scrollInterval = null;
const SCROLL_INTERVAL_MS = 20; // For a smooth scroll effect
const MANUAL_SCROLL_STOP_DELAY_MS = 150;

function doScroll(speed) {
    // speed is px/sec. The interval runs every SCROLL_INTERVAL_MS.
    const scrollAmount = speed * (SCROLL_INTERVAL_MS / 1000);
    window.scrollBy(0, scrollAmount);
    debouncedSaveScroll();

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        stopAutoScroll();
    }
}

export function startAutoScroll() {
    if (scrollInterval) return;

    const settings = getCurrentSettings();
    const speed = settings.autoScrollSpeed;

    if (!settings.autoScrollEnabled || !speed) {
        stopAutoScroll();
        return;
    }

    scrollInterval = setInterval(() => doScroll(speed), SCROLL_INTERVAL_MS);
    UIState.update("isAutoScrolling", true);
}

export function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        UIState.update("isAutoScrolling", false);
    }
}

export function toggleAutoScroll() {
    const settings = getCurrentSettings();
    const newStatus = !settings.autoScrollEnabled;

    withCurrentManga((manga) => {
        updateSettings(manga.id, { autoScrollEnabled: newStatus });
    });

    if (newStatus) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

export function resumeAutoScrollIfEnabled() {
    const settings = getCurrentSettings();
    if (settings.autoScrollEnabled) {
        startAutoScroll();
    }
}

function handleManualScroll() {
    if (UIState.isAutoScrolling) {
        // A manual scroll action stops the auto-scroll.
        stopAutoScroll();
    }
}

// Debounced listener for manual scroll
let scrollTimeout;
function debouncedManualScrollListener() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(handleManualScroll, MANUAL_SCROLL_STOP_DELAY_MS);
}

export function initAutoScrollListener() {
    window.addEventListener("scroll", debouncedManualScrollListener, { passive: true });
}

export function destroyAutoScrollListener() {
    window.removeEventListener("scroll", debouncedManualScrollListener);
    stopAutoScroll();
}
