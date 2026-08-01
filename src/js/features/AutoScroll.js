import { UIState } from "../state/State";

import { getCurrentSettings, updateSettings } from "../state/MangaSettings";
import { withCurrentManga } from "../state/MangaLibrary";
import { debounce } from "../core/Utils";
import { debouncedSaveScroll } from "../viewer/ViewerScroll";

let scrollInterval = null;
const SCROLL_INTERVAL_MS = 20;
const MANUAL_SCROLL_STOP_DELAY_MS = 150;

function doScroll(speed) {
    // Convert px/sec to px per interval.
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

const debouncedManualScrollListener = debounce(handleManualScroll, MANUAL_SCROLL_STOP_DELAY_MS);

export function initAutoScrollListener() {
    window.addEventListener("scroll", debouncedManualScrollListener, { passive: true });
}

export function destroyAutoScrollListener() {
    window.removeEventListener("scroll", debouncedManualScrollListener);
    stopAutoScroll();
}
