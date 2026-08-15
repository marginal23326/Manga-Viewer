import { getCurrentSettings, updateSettings } from "@/state/manga-settings";
import { UIState } from "@/state";
import { debounce } from "@/core/utils";
import { debouncedSaveScroll } from "@/viewer/scroll-position";
import { getCurrentManga } from "@/state/manga-library";

let scrollInterval: ReturnType<typeof setInterval> | null = null;
const SCROLL_INTERVAL_MS = 20;

function doScroll(speed: number): void {
    // Convert px/sec to px per interval.
    const scrollAmount = speed * (SCROLL_INTERVAL_MS / 1000);
    window.scrollBy(0, scrollAmount);
    debouncedSaveScroll();

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        stopAutoScroll();
    }
}

export function startAutoScroll(): void {
    if (scrollInterval != null) return;

    const settings = getCurrentSettings();
    const speed = settings.autoScrollSpeed;

    if (!settings.autoScrollEnabled || !speed) {
        stopAutoScroll();
        return;
    }

    scrollInterval = setInterval(() => doScroll(speed), SCROLL_INTERVAL_MS);
    UIState.isAutoScrolling = true;
}

export function stopAutoScroll(): void {
    if (scrollInterval != null) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        UIState.isAutoScrolling = false;
    }
}

export function toggleAutoScroll(): void {
    const settings = getCurrentSettings();
    const newStatus = !settings.autoScrollEnabled;

    const manga = getCurrentManga();
    if (manga) {
        updateSettings(manga.id, { autoScrollEnabled: newStatus });
    }

    if (newStatus) {
        startAutoScroll();
    } else {
        stopAutoScroll();
    }
}

export function resumeAutoScrollIfEnabled(): void {
    const settings = getCurrentSettings();
    if (settings.autoScrollEnabled) {
        startAutoScroll();
    }
}

function handleManualScroll(): void {
    if (UIState.isAutoScrolling) {
        // A manual scroll action stops the auto-scroll.
        stopAutoScroll();
    }
}

const debouncedManualScrollListener = debounce(handleManualScroll);

export function initAutoScrollListener(): void {
    window.addEventListener("scroll", debouncedManualScrollListener, { passive: true });
}

export function destroyAutoScrollListener(): void {
    window.removeEventListener("scroll", debouncedManualScrollListener);
    stopAutoScroll();
}
