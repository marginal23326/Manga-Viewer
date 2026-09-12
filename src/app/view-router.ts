import type { CurrentView, Manga } from "@/types";
import { requireElement, setVisible } from "@/core/dom-utils";
import { PersistState } from "@/state";
import { invalidateChapterLoad } from "@/viewer/chapter";
import { resumeOrStartManga } from "@/viewer/resume-prompt";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { waitForNextPaint } from "@/core/utils";

const homepageContainer = requireElement("#homepage-container");
const viewerContainer = requireElement("#viewer-container");

function render(view: CurrentView): void {
    const showingViewer = view === "viewer";

    setVisible(homepageContainer, !showingViewer);
    setVisible(viewerContainer, showingViewer);

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
    PersistState.onChange("currentView", render, { immediate: true });
}
