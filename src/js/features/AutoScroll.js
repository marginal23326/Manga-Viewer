import { State } from "../core/State";

import { saveCurrentScrollPosition } from "./ImageManager";
import { loadCurrentSettings, updateMangaSetting } from "./SettingsManager";

let scrollInterval = null;
const SCROLL_INTERVAL_MS = 20; // For a smooth scroll effect
const MANUAL_SCROLL_STOP_DELAY_MS = 150;

function doScroll(speed) {
    // speed is px/sec. The interval runs every SCROLL_INTERVAL_MS.
    const scrollAmount = speed * (SCROLL_INTERVAL_MS / 1000);
    window.scrollBy(0, scrollAmount);
    saveCurrentScrollPosition();

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        stopAutoScroll();
    }
}

export function startAutoScroll() {
    if (scrollInterval) return;

    const settings = loadCurrentSettings();
    const speed = settings.autoScrollSpeed;

    if (!settings.autoScrollEnabled || !speed) {
        stopAutoScroll();
        return;
    }

    scrollInterval = setInterval(() => doScroll(speed), SCROLL_INTERVAL_MS);
    State.update("isAutoScrolling", true, false);
}

export function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        State.update("isAutoScrolling", false, false);
    }
}

export function toggleAutoScroll() {
    const settings = loadCurrentSettings();
    const newStatus = !settings.autoScrollEnabled;

    if (State.currentManga) {
        updateMangaSetting(State.currentManga.id, "autoScrollEnabled", newStatus);
    }

    if (newStatus) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

export function resumeAutoScrollIfEnabled() {
    const settings = loadCurrentSettings();
    if (settings.autoScrollEnabled) {
        startAutoScroll();
    }
}

function handleManualScroll() {
    if (State.isAutoScrolling) {
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
