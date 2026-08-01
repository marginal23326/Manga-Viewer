import { DOM, hideElement, showElement } from "../core/DOMUtils";
import { destroyAutoScrollListener, initAutoScrollListener } from "../features/AutoScroll";
import { destroyProgressBar, initProgressBar } from "../features/ProgressBar";
import { invalidateChapterLoad, loadChapterImages } from "../features/ImageManager";
import { AppEvents } from "../core/AppEvents";
import { PersistState } from "../state/State";
import { applyMangaSettings } from "../features/ViewerSettingsRuntime";
import { getMangaList } from "../state/MangaLibrary";
import { getSettings } from "../state/MangaSettings";
import { saveCurrentScrollPosition } from "../viewer/ViewerScroll";
import { updateViewerControlsVisibility } from "./ViewerControls";

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
