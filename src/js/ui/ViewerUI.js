import { DOM, showElement, hideElement, addClass, removeClass } from "../core/DOMUtils";
import { State } from "../core/State";
import { initAutoScrollListener, destroyAutoScrollListener } from "../features/AutoScroll";
import { invalidateChapterLoad, loadChapterImages, saveCurrentScrollPosition } from "../features/ImageManager";
import { cancelPendingViewerLoad, getMangaList } from "../features/MangaManager";
import { updateFullscreenIcon } from "../features/NavigationManager";
import { initProgressBar, destroyProgressBar } from "../features/ProgressBar";
import { loadMangaSettings, applyMangaSettings } from "../features/SettingsManager";
import { updateSidebarViewerControls } from "../features/SidebarManager";

export function showHomepage() {
    if (DOM.homepageContainer) showElement(DOM.homepageContainer);
    if (DOM.viewerContainer) hideElement(DOM.viewerContainer);

    window.scrollTo(0, 0);

    updateSidebarViewerControls(false);
    const nav = DOM.navContainer;
    if (nav) {
        removeClass(nav, "opacity-100 translate-y-0");
        addClass(nav, "opacity-0 -translate-y-[150%]");
        State.update("isNavVisible", false, false);
    }
}

export function showViewer() {
    if (DOM.homepageContainer) hideElement(DOM.homepageContainer);
    if (DOM.viewerContainer) showElement(DOM.viewerContainer, "flex");

    updateSidebarViewerControls(true);
    initProgressBar();
    initAutoScrollListener();
}

export function returnToHome() {
    cancelPendingViewerLoad();
    invalidateChapterLoad({ clearImages: true });
    saveCurrentScrollPosition();
    destroyProgressBar();
    destroyAutoScrollListener();
    State.update("currentMangaId", null, true);
    if (State.update("currentView", "homepage")) {
        showHomepage();
    }
}

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function handleFullscreenChange() {
    const isFullscreen = !!document.fullscreenElement;
    updateFullscreenIcon(isFullscreen);
}

/**
 * Sets up fullscreen listener and displays initial view based on saved state.
 */
export function initViewerState() {
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    const currentMangaId = State.currentMangaId;
    const savedManga = getMangaList().find((m) => m.id === currentMangaId);

    if (State.currentView === "viewer" && savedManga) {
        showViewer();
        const settings = loadMangaSettings(savedManga.id);
        applyMangaSettings();
        setTimeout(() => loadChapterImages(settings.currentChapter || 0), 60);
    } else {
        State.update("currentView", "homepage", true);
        State.update("currentMangaId", null, true);
        showHomepage();
    }
}
