import { CurrentProgress, ViewerState, getMangaList, refreshMangaFromDisk } from "@/state";
import { closeResumePrompt, resolveResumeChapter } from "@/viewer/resume-prompt";
import { createGenerationGuard, waitForNextPaint } from "@/core/utils";
import { forceLoadChapter, imageContainer, invalidateChapterLoad } from "@/viewer/chapter";
import { h, requireElement, setVisible } from "@/core/dom-utils";
import { navigateTo, parseRoute, replaceRoute } from "./hash-route";
import { sidebarElement, sidebarToggleContainer } from "./sidebar";
import type { Manga } from "@/types";
import { createModal } from "@/components/modal";
import { homepageContainer } from "@/library/home-page-ui";
import { navContainerElement } from "@/viewer/nav-bar";
import { progressBarContainer } from "@/viewer/progress-bar";
import { saveCurrentScrollPosition } from "@/viewer/scroll-position";
import { scrubberParent } from "@/viewer/scrubber";

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
const routeGuard = createGenerationGuard();

export function initAppShell(): void {
    const app = requireElement("#app");
    const mainContent = h("div", { className: "grow", id: "main-content" }, homepageContainer, viewerContainer);
    app.replaceChildren(sidebarToggleContainer, sidebarElement, mainContent);
}

function renderLibrary(): void {
    routeGuard.next();
    accessGateModal.close();
    if (ViewerState.currentMangaId !== null) {
        saveCurrentScrollPosition();
        ViewerState.update("currentMangaId", null);
    }
    setVisible(homepageContainer, true);
    setVisible(viewerContainer, false);
    invalidateChapterLoad();
    scrollTo(0, 0);
}

function loadMangaChapter(mangaId: string, chapterIndex: number): void {
    const active = ViewerState.activeChapter;
    if (active?.mangaId === mangaId && active.chapterIndex === chapterIndex) return;
    const restore = chapterIndex === CurrentProgress.currentChapter ? CurrentProgress.scrollAnchor : undefined;
    forceLoadChapter(chapterIndex, restore);
}

async function enterManga(mangaId: string, chapterIndex?: number): Promise<void> {
    const generation = routeGuard.next();
    const manga = getMangaList().find((entry) => entry.id === mangaId);
    if (!manga) {
        replaceRoute({ name: "library" });
        renderLibrary();
        return;
    }

    if (ViewerState.currentMangaId !== mangaId) ViewerState.update("currentMangaId", mangaId);
    setVisible(homepageContainer, false);
    setVisible(viewerContainer, true);

    if (ViewerState.activeChapter?.mangaId === mangaId) {
        if (chapterIndex === undefined) {
            replaceRoute({ chapterIndex: ViewerState.activeChapter.chapterIndex, id: mangaId, name: "manga" });
        } else {
            loadMangaChapter(mangaId, chapterIndex);
        }
        return;
    }

    const chapterCount = await refreshMangaFromDisk(manga.id);
    if (!routeGuard.isCurrent(generation)) return;

    if (chapterCount === null) {
        showAccessGate(manga, chapterIndex);
        return;
    }

    accessGateModal.close();
    await waitForNextPaint();
    if (!routeGuard.isCurrent(generation)) return;

    if (chapterIndex === undefined) {
        const decision = await resolveResumeChapter();
        if (!routeGuard.isCurrent(generation)) return;
        replaceRoute({ chapterIndex: decision.chapterIndex, id: mangaId, name: "manga" });
        forceLoadChapter(decision.chapterIndex, decision.restore);
        return;
    }

    loadMangaChapter(mangaId, chapterIndex);
}

function showAccessGate(manga: Manga, chapterIndex?: number): void {
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
                        navigateTo({ name: "library" });
                    },
                    side: "left",
                    text: "Return to library",
                    type: "secondary",
                },
                {
                    onClick: () => void enterManga(manga.id, chapterIndex),
                    text: "Continue reading",
                    type: "primary",
                },
            ],
            closeOnBackdropClick: false,
            closeOnEscape: false,
            content,
            title: "Folder access needed",
        };
    });
}

function syncDocumentTitle(): void {
    const active = ViewerState.activeChapter;
    if (!active) {
        if (parseRoute(location.hash).name === "library") document.title = "Manga Viewer";
        return;
    }
    const manga = getMangaList().find((entry) => entry.id === active.mangaId);
    document.title = manga ? `Ch. ${active.chapterIndex + 1} · ${manga.title}` : "Manga Viewer";
}

function handleRoute(): void {
    closeResumePrompt();
    const route = parseRoute(location.hash);
    if (route.name === "library") renderLibrary();
    else void enterManga(route.id, route.chapterIndex);
}

export function initViewerState(): void {
    initAppShell();
    ViewerState.onChange("activeChapter", syncDocumentTitle);
    addEventListener("hashchange", handleRoute);
    if (!location.hash || location.hash === "#") replaceRoute({ name: "library" });
    handleRoute();
}
