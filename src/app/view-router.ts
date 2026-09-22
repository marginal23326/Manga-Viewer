import { PersistState, getCurrentManga, refreshMangaFromDisk } from "@/state";
import { h, requireElement, setVisible } from "@/core/dom-utils";
import type { Manga } from "@/types";
import { createModal } from "@/components/modal";
import { invalidateChapterLoad } from "@/viewer/chapter";
import { resumeOrStartManga } from "@/viewer/resume-prompt";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { waitForNextPaint } from "@/core/utils";

const homepageContainer = requireElement("#homepage-container");
const viewerContainer = requireElement("#viewer-container");
const accessGateModal = createModal();

function render(mangaId: string | null): void {
    const showingViewer = mangaId !== null;

    setVisible(homepageContainer, !showingViewer);
    setVisible(viewerContainer, showingViewer);

    if (showingViewer) {
        void enterViewer();
    } else {
        invalidateChapterLoad();
        scrollTo(0, 0);
    }
}

async function enterViewer(): Promise<void> {
    const manga = getCurrentManga();
    if (!manga) {
        returnToHome();
        return;
    }

    const chapterCount = await refreshMangaFromDisk(manga.id);
    if (chapterCount === null) {
        showAccessGate(manga);
        return;
    }

    accessGateModal.close();
    await waitForNextPaint();
    if (PersistState.currentMangaId !== null) resumeOrStartManga();
}

function showAccessGate(manga: Manga): void {
    accessGateModal.show(() => {
        const content = h(
            "p",
            { className: "text-sm text-secondary" },
            `Your browser needs to confirm access to "${manga.folderName}" again before "${manga.title}" can load.`,
        );

        return {
            buttons: [
                {
                    onClick: () => {
                        accessGateModal.close();
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
            title: "Folder access needed",
        };
    });
}

export function returnToHome(): void {
    saveCurrentScrollPosition();
    PersistState.update("currentMangaId", null);
}

/** Displays the initial view based on the saved state. */
export function initViewerState(): void {
    PersistState.onChange("currentMangaId", render, { immediate: true });
}
