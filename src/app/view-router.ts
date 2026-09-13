import type { CurrentView, Manga } from "@/types";
import { PersistState, getCurrentManga, getMangaChapterCount, updateManga } from "@/state";
import { h, requireElement, setVisible } from "@/core/dom-utils";
import { hideModal, showModal } from "@/components/modal";
import { invalidateChapterLoad } from "@/viewer/chapter";
import { resumeOrStartManga } from "@/viewer/resume-prompt";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { waitForNextPaint } from "@/core/utils";

const homepageContainer = requireElement("#homepage-container");
const viewerContainer = requireElement("#viewer-container");
const ACCESS_GATE_MODAL_ID = "manga-access-gate-modal";

function render(view: CurrentView): void {
    const showingViewer = view === "viewer";

    setVisible(homepageContainer, !showingViewer);
    setVisible(viewerContainer, showingViewer);

    if (showingViewer) {
        void enterViewer();
    } else {
        invalidateChapterLoad(true);
        scrollTo(0, 0);
    }
}

async function enterViewer(): Promise<void> {
    const manga = getCurrentManga();
    if (!manga) {
        returnToHome();
        return;
    }

    const chapterCount = await getMangaChapterCount(manga.id);
    if (chapterCount === null) {
        showAccessGate(manga);
        return;
    }

    hideModal(ACCESS_GATE_MODAL_ID);
    updateManga(manga.id, { totalChapters: chapterCount });

    await waitForNextPaint();
    if (PersistState.currentView === "viewer") resumeOrStartManga();
}

function showAccessGate(manga: Manga): void {
    const content = h(
        "p",
        { className: "text-sm text-secondary" },
        `Your browser needs to confirm access to "${manga.folderName}" again before "${manga.title}" can load.`,
    );

    showModal(ACCESS_GATE_MODAL_ID, {
        buttons: [
            {
                onClick: () => {
                    hideModal(ACCESS_GATE_MODAL_ID);
                    returnToHome();
                },
                side: "left",
                text: "Return to library",
                type: "secondary",
            },
            { onClick: () => void enterViewer(), text: "Continue reading", type: "primary" },
        ],
        closeOnBackdropClick: false,
        closeOnEscape: false,
        content,
        showCloseButton: false,
        size: "sm",
        title: "Folder access needed",
    });
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
