import {
    DEFAULT_MANGA_PROGRESS,
    type MangaSession,
    ViewerState,
    closeSession,
    getChapterPageCount,
    getManga,
    openSession,
    refreshMangaFromDisk,
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
    closeSession();
}

async function openChapter(
    { mangaId, progress }: MangaSession,
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
    ViewerState.update("activeChapter", pageCount > 0 ? { chapterIndex, generation, mangaId, pageCount, start } : null);
    // After the swap: the outgoing chapter saves its position as it unmounts, and must not clobber this bookmark.
    progress.update("currentChapter", chapterIndex);
    progress.update("scrollAnchor", start);
}

async function enterManga(mangaId: string, requestedChapter?: number): Promise<void> {
    const generation = routeGuard.next();
    const manga = getManga(mangaId);
    if (!manga) {
        replaceRoute({ name: "library" });
        renderLibrary();
        return;
    }

    const session = openSession(mangaId);
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
        const { chapterIndex, restore } = await resolveResumeChapter(session.progress);
        if (routeGuard.isCurrent(generation)) await openChapter(session, chapterIndex, restore);
        return;
    }

    if (shown?.chapterIndex === requestedChapter) return;
    const { progress } = session;
    const restore = requestedChapter === progress.currentChapter ? progress.scrollAnchor : undefined;
    await openChapter(session, requestedChapter, restore);
}

export async function reloadManga(): Promise<void> {
    const { session } = ViewerState;
    if (!session) return;

    const generation = routeGuard.next();
    const chapterCount = await refreshMangaFromDisk(session.mangaId);
    if (chapterCount === null || !routeGuard.isCurrent(generation)) return;

    await openChapter(session, session.progress.currentChapter, currentScrollAnchor() ?? undefined);
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
