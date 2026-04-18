import { DOM, showElement, hideElement, addClass, removeClass } from "../core/DOMUtils";
import { getMangaList } from "../core/MangaLibrary";
import { getSettings } from "../core/MangaSettings";
import { PersistState, UIState } from "../core/State";
import { saveCurrentScrollPosition } from "../core/ViewerScroll";
import { initAutoScrollListener, destroyAutoScrollListener } from "../features/AutoScroll";
import { invalidateChapterLoad, loadChapterImages } from "../features/ImageManager";
import { initProgressBar, destroyProgressBar } from "../features/ProgressBar";
import { applyMangaSettings } from "../features/ViewerSettingsRuntime";
import { updateViewerControlsVisibility } from "./ViewerControls";

function showHomepage() {
    if (DOM.homepageContainer) showElement(DOM.homepageContainer);
    if (DOM.viewerContainer) hideElement(DOM.viewerContainer);

    window.scrollTo(0, 0);

    updateViewerControlsVisibility(false);
    const nav = DOM.navContainer;
    if (nav) {
        removeClass(nav, "opacity-100 translate-y-0");
        addClass(nav, "opacity-0 -translate-y-[150%]");
        UIState.update("isNavVisible", false);
    }
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
    const currentMangaId = PersistState.currentMangaId;
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
