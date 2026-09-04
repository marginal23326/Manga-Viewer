import type { CurrentView, Manga } from "@/types";
import { DOM, setVisible } from "@/core/dom-utils";
import { PersistState, getMangaList } from "@/state";
import { invalidateChapterLoad } from "@/viewer/chapter";
import { resumeOrStartManga } from "@/viewer/resume-prompt";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { waitForNextPaint } from "@/core/utils";

function render(view: CurrentView): void {
    const showingViewer = view === "viewer";

    setVisible(DOM.homepageContainer, !showingViewer);
    setVisible(DOM.viewerContainer, showingViewer);

    if (showingViewer) {
        void waitForNextPaint().then(() => {
            if (PersistState.currentView === "viewer") resumeOrStartManga();
        });
    } else {
        invalidateChapterLoad(true);
        scrollTo(0, 0);
    }
}

export function returnToHome(): void {
    saveCurrentScrollPosition();
    PersistState.update("currentMangaId", null);
    PersistState.update("currentView", "homepage");
}

export function enterManga(manga: Manga): void {
    PersistState.update("currentMangaId", manga.id);
    PersistState.update("currentView", "viewer");
}

/** Displays the initial view based on the saved state. */
export function initViewerState(): void {
    const { currentMangaId, currentView } = PersistState;
    const savedManga = getMangaList().find((manga) => manga.id === currentMangaId);

    if (currentView !== "viewer" || !savedManga) {
        PersistState.update("currentMangaId", null);
        PersistState.update("currentView", "homepage");
    }

    PersistState.onChange("currentView", render, { immediate: true });
}
