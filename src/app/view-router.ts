import { $, $$, DOM, setVisible } from "@/core/dom-utils";
import { destroyAutoScrollListener, initAutoScrollListener } from "@/viewer/auto-scroll";
import { destroyProgressBar, initProgressBar } from "@/viewer/progress-bar";
import { invalidateChapterLoad, loadChapterImages } from "@/viewer/chapter";
import { PersistState } from "@/state";
import { applyMangaSettings } from "@/settings/runtime";
import { emitAppEvent } from "@/core/app-events";
import { getMangaList } from "@/state/manga-library";
import { getSettings } from "@/state/manga-settings";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";

export function updateViewerControlsVisibility(showViewerControls: boolean): void {
    setVisible($("#return-to-home"), showViewerControls);

    const { sidebar } = DOM;
    if (!sidebar) return;

    $$('[data-viewer-only="true"]', sidebar).forEach((element) => {
        setVisible(element, showViewerControls);
    });
}

function showHomepage(): void {
    setVisible(DOM.homepageContainer, true);
    setVisible(DOM.viewerContainer, false);

    window.scrollTo(0, 0);

    updateViewerControlsVisibility(false);
    emitAppEvent("navHideRequested");
}

export function showViewer(): void {
    setVisible(DOM.homepageContainer, false);
    setVisible(DOM.viewerContainer, true, "flex");

    updateViewerControlsVisibility(true);
    initProgressBar();
    initAutoScrollListener();
    applyMangaSettings();
}

export function returnToHome(): void {
    invalidateChapterLoad({ clearImages: true });
    saveCurrentScrollPosition();
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
        setTimeout(() => loadChapterImages(settings.currentChapter ?? 0), 60);
    } else {
        PersistState.update("currentView", "homepage");
        PersistState.update("currentMangaId", null);
        showHomepage();
    }
}
