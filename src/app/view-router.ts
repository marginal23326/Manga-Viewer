import {
    DEFAULT_MANGA_PROGRESS,
    ViewerState,
    getChapterPageCount,
    getManga,
    readProgress,
    refreshMangaFromDisk,
    saveProgress,
    setCurrentManga,
} from "@/state";
import type { Manga, ScrollAnchor } from "@/types";
import { clamp, createGenerationGuard } from "@/core/utils";
import { closeResumePrompt, resolveResumeChapter } from "@/viewer/resume-prompt";
import { navigateTo, parseRoute, replaceRoute } from "./hash-route";
import { createModal } from "@/components/modal";
import { currentScrollAnchor } from "@/viewer/virtualizer";
import { h } from "@/core/dom-utils";

const accessGateModal = createModal();
const routeGuard = createGenerationGuard();

function syncDocumentTitle(): void {
    const chapter = ViewerState.activeChapter;
    const manga = getManga(chapter?.mangaId);
    document.title = chapter && manga ? `Ch. ${chapter.chapterIndex + 1} · ${manga.title}` : "Manga Viewer";
}

function renderLibrary(): void {
    routeGuard.next();
    accessGateModal.close();
    ViewerState.update("activeChapter", null);
    setCurrentManga(null);
}

async function openChapter(
    mangaId: string,
    requestedChapter: number,
    restore: ScrollAnchor | undefined,
): Promise<void> {
    const generation = routeGuard.next();
    const inRange = requestedChapter < (getManga(mangaId)?.totalChapters ?? 0);
    const chapterIndex = inRange ? requestedChapter : 0;
    const anchor = (inRange ? restore : undefined) ?? DEFAULT_MANGA_PROGRESS.scrollAnchor;
    replaceRoute({ chapterIndex, id: mangaId, name: "manga" });

    const pageCount = (await getChapterPageCount({ chapterIndex, mangaId })) ?? 0;
    if (!routeGuard.isCurrent(generation)) return;

    const index = clamp(anchor.index, 0, Math.max(pageCount - 1, 0));
    const start = { index, pageFraction: index === anchor.index ? anchor.pageFraction : 0 };

    ViewerState.update("visibleImageIndex", start.index);
    ViewerState.update("activeChapter", { chapterIndex, generation, mangaId, pageCount, start });
    // After the swap: the outgoing chapter saves its position as it unmounts, and must not clobber this bookmark.
    saveProgress(mangaId, { currentChapter: chapterIndex, scrollAnchor: start });
}

async function enterManga(mangaId: string, requestedChapter?: number): Promise<void> {
    const generation = routeGuard.next();
    const manga = getManga(mangaId);
    if (!manga) {
        replaceRoute({ name: "library" });
        renderLibrary();
        return;
    }

    setCurrentManga(mangaId);
    const shown = ViewerState.activeChapter?.mangaId === mangaId ? ViewerState.activeChapter : null;

    if (!shown) {
        const chapterCount = await refreshMangaFromDisk(mangaId);
        if (!routeGuard.isCurrent(generation)) return;

        if (chapterCount === null) {
            showAccessGate(manga);
            return;
        }
        accessGateModal.close();
    }

    if (requestedChapter === undefined) {
        if (shown) {
            replaceRoute({ chapterIndex: shown.chapterIndex, id: mangaId, name: "manga" });
            return;
        }
        const { chapterIndex, restore } = await resolveResumeChapter(readProgress(mangaId));
        if (routeGuard.isCurrent(generation)) await openChapter(mangaId, chapterIndex, restore);
        return;
    }

    if (shown?.chapterIndex === requestedChapter) return;
    const progress = readProgress(mangaId);
    const restore = requestedChapter === progress.currentChapter ? progress.scrollAnchor : undefined;
    await openChapter(mangaId, requestedChapter, restore);
}

export async function reloadManga(): Promise<void> {
    const { currentMangaId } = ViewerState;
    if (currentMangaId === null) return;

    const generation = routeGuard.next();
    const chapterCount = await refreshMangaFromDisk(currentMangaId);
    if (chapterCount === null || !routeGuard.isCurrent(generation)) return;

    await openChapter(currentMangaId, readProgress(currentMangaId).currentChapter, currentScrollAnchor() ?? undefined);
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
                    onClick: () => navigateTo({ name: "library" }),
                    side: "left",
                    text: "Return to library",
                    type: "secondary",
                },
                {
                    onClick: handleRoute,
                    text: "Continue reading",
                    type: "primary",
                },
            ],
            closedby: "none",
            content,
            title: "Folder access needed",
        };
    });
}

function handleRoute(): void {
    closeResumePrompt();
    const route = parseRoute(location.hash);
    if (route.name === "library") renderLibrary();
    else void enterManga(route.id, route.chapterIndex);
}

export function startRouter(): void {
    ViewerState.onChange("activeChapter", syncDocumentTitle);
    addEventListener("hashchange", handleRoute);
    if (!location.hash || location.hash === "#") replaceRoute({ name: "library" });
    handleRoute();
}
