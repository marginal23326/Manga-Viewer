import { DOM, setVisible } from "@/core/dom-utils";
import { PersistState, getMangaList, getSettings } from "@/state";
import { destroyAutoScrollListener, initAutoScrollListener } from "@/viewer/auto-scroll";
import { destroyProgressBar, initProgressBar } from "@/viewer/progress-bar";
import { invalidateChapterLoad, loadChapterImages } from "@/viewer/chapter";
import { applyMangaSettings } from "@/settings/runtime";
import { emitAppEvent } from "@/core/app-events";
import { waitForNextPaint } from "@/core/utils";

function showHomepage(): void {
    setVisible(DOM.homepageContainer, true);
    setVisible(DOM.viewerContainer, false);

    window.scrollTo(0, 0);

    setVisible(DOM.sidebarToggleContainer, false);
    emitAppEvent("navHideRequested");
    emitAppEvent("viewChanged", { showViewer: false });
}

export function showViewer(): void {
    setVisible(DOM.homepageContainer, false);
    setVisible(DOM.viewerContainer, true, "flex");

    setVisible(DOM.sidebarToggleContainer, true);
    emitAppEvent("viewChanged", { showViewer: true });
    initProgressBar();
    initAutoScrollListener();
    applyMangaSettings();
}

export function returnToHome(): void {
    invalidateChapterLoad({ clearImages: true });
    destroyProgressBar();
    destroyAutoScrollListener();
    PersistState.update("currentMangaId", null);
    if (PersistState.update("currentView", "homepage")) {
        showHomepage();
    }
}

/** Sets up fullscreen listener and displays initial view based on saved state. */
export function initViewerState(): void {
    const { currentMangaId } = PersistState;
    const savedManga = getMangaList().find((manga) => manga.id === currentMangaId);

    if (PersistState.currentView === "viewer" && savedManga) {
        showViewer();
        const settings = getSettings(savedManga.id);
        void waitForNextPaint().then(() => {
            if (PersistState.currentView !== "viewer") {
                return;
            }
            loadChapterImages(settings.currentChapter);
        });
    } else {
        PersistState.update("currentView", "homepage");
        PersistState.update("currentMangaId", null);
        showHomepage();
    }
}
