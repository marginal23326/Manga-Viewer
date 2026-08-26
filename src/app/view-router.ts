import { DOM, setVisible } from "@/core/dom-utils";
import { PersistState, getMangaList } from "@/state";
import { destroyAutoScrollListener, initAutoScrollListener } from "@/viewer/auto-scroll";
import { destroyProgressBar, initProgressBar } from "@/viewer/progress-bar";
import type { Manga } from "@/types";
import { emitAppEvent } from "@/core/app-events";
import { invalidateChapterLoad } from "@/viewer/chapter";
import { resumeOrStartManga } from "@/viewer/resume-prompt";
import { waitForNextPaint } from "@/core/utils";

function showHomepage(): void {
    setVisible(DOM.homepageContainer, true);
    setVisible(DOM.viewerContainer, false);

    window.scrollTo(0, 0);

    setVisible(DOM.sidebarToggleContainer, false);
    emitAppEvent("navHideRequested");
    emitAppEvent("viewChanged", { showViewer: false });
}

let viewerShown = false;

export function showViewer(): void {
    if (viewerShown) return;
    viewerShown = true;

    setVisible(DOM.homepageContainer, false);
    setVisible(DOM.viewerContainer, true);

    setVisible(DOM.sidebarToggleContainer, true);
    emitAppEvent("viewChanged", { showViewer: true });
    initProgressBar();
    initAutoScrollListener();
}

export function returnToHome(): void {
    invalidateChapterLoad({ clearImages: true });
    destroyProgressBar();
    destroyAutoScrollListener();
    viewerShown = false;
    PersistState.update("currentMangaId", null);
    PersistState.update("currentView", "homepage");
    showHomepage();
}

export function enterManga(manga: Manga): void {
    PersistState.update("currentMangaId", manga.id);
    PersistState.update("currentView", "viewer");
    showViewer();
    void waitForNextPaint().then(() => {
        if (PersistState.currentView === "viewer") resumeOrStartManga();
    });
}

/** Sets up fullscreen listener and displays initial view based on saved state. */
export function initViewerState(): void {
    const { currentMangaId } = PersistState;
    const savedManga = getMangaList().find((manga) => manga.id === currentMangaId);

    if (PersistState.currentView === "viewer" && savedManga) {
        enterManga(savedManga);
    } else {
        PersistState.update("currentView", "homepage");
        PersistState.update("currentMangaId", null);
        showHomepage();
    }
}
