import { PersistState, getCurrentManga, refreshMangaFromDisk } from "@/state";
import { h, requireElement, setVisible } from "@/core/dom-utils";
import { imageContainer, invalidateChapterLoad } from "@/viewer/chapter";
import { sidebarElement, sidebarToggleContainer } from "./sidebar";
import type { Manga } from "@/types";
import { createModal } from "@/components/modal";
import { homepageContainer } from "@/library/home-page-ui";
import { navContainerElement } from "@/viewer/nav-bar";
import { progressBarContainer } from "@/viewer/progress-bar";
import { resumeOrStartManga } from "@/viewer/resume-prompt";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { scrubberParent } from "@/viewer/scrubber";
import { waitForNextPaint } from "@/core/utils";

export const viewerContainer = h(
    "div",
    {
        className: "flex flex-col items-center relative",
        hidden: true,
        id: "viewer-container",
    },
    progressBarContainer,
    imageContainer,
    navContainerElement,
    scrubberParent,
);

const accessGateModal = createModal();

export function initAppShell(): void {
    const app = requireElement("#app");
    const mainContent = h("div", { className: "grow", id: "main-content" }, homepageContainer, viewerContainer);
    app.replaceChildren(sidebarToggleContainer, sidebarElement, mainContent);
}

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

export function initViewerState(): void {
    initAppShell();
    PersistState.onChange("currentMangaId", render, { immediate: true });
}
