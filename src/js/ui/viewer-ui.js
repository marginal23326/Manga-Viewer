import { DOM, hideElement, showElement } from "../core/dom-utils";
import { destroyAutoScrollListener, initAutoScrollListener } from "../features/auto-scroll";
import { destroyProgressBar, initProgressBar } from "../features/progress-bar";
import { invalidateChapterLoad, loadChapterImages } from "../features/image-manager";
import { AppEvents } from "../core/app-events";
import { PersistState } from "../state/state";
import { applyMangaSettings } from "../features/viewer-settings-runtime";
import { getMangaList } from "../state/manga-library";
import { getSettings } from "../state/manga-settings";
import { saveCurrentScrollPosition } from "../viewer/viewer-scroll";
import { updateViewerControlsVisibility } from "./viewer-controls";

function showHomepage() {
    if (DOM.homepageContainer) showElement(DOM.homepageContainer);
    if (DOM.viewerContainer) hideElement(DOM.viewerContainer);

    window.scrollTo(0, 0);

    updateViewerControlsVisibility(false);
    AppEvents.dispatchEvent(new CustomEvent("navHideRequested"));
}

export function showViewer() {
    if (DOM.homepageContainer) hideElement(DOM.homepageContainer);
    if (DOM.viewerContainer) showElement(DOM.viewerContainer, "flex");

    updateViewerControlsVisibility(true);
    initProgressBar();
    initAutoScrollListener();
    applyMangaSettings();
}

export function returnToHome() {
    invalidateChapterLoad({ clearImages: true });
    saveCurrentScrollPosition();
    destroyProgressBar();
    destroyAutoScrollListener();
    PersistState.update("currentMangaId", null);
    if (PersistState.update("currentView", "homepage")) {
        showHomepage();
    }
}

/**
 * Sets up fullscreen listener and displays initial view based on saved state.
 */
export function initViewerState() {
    const { currentMangaId } = PersistState;
    const savedManga = getMangaList().find((m) => m.id === currentMangaId);

    if (PersistState.currentView === "viewer" && savedManga) {
        showViewer();
        const settings = getSettings(savedManga.id);
        setTimeout(() => loadChapterImages(settings.currentChapter || 0), 60);
    } else {
        PersistState.update("currentView", "homepage");
        PersistState.update("currentMangaId", null);
        showHomepage();
    }
}
