import { type MangaSession, ViewerState, closeSession, getMangaList, openSession, refreshMangaFromDisk } from "@/state";
import { closeResumePrompt, resolveResumeChapter } from "@/viewer/resume-prompt";
import { navigateTo, parseRoute, replaceRoute } from "./hash-route";
import type { Manga } from "@/types";
import type { Viewer } from "@/viewer/viewer";
import { createGenerationGuard } from "@/core/utils";
import { createModal } from "@/components/modal";
import { h } from "@/core/dom-utils";

const accessGateModal = createModal();
const routeGuard = createGenerationGuard();

function syncDocumentTitle(): void {
    const active = ViewerState.activeChapter;
    if (!active) {
        if (parseRoute(location.hash).name === "library") document.title = "Manga Viewer";
        return;
    }
    const manga = getMangaList().find((entry) => entry.id === active.mangaId);
    document.title = manga ? `Ch. ${active.chapterIndex + 1} · ${manga.title}` : "Manga Viewer";
}

export function startRouter(viewer: Viewer): void {
    function renderLibrary(): void {
        routeGuard.next();
        accessGateModal.close();
        viewer.unload();
        closeSession();
    }

    function loadMangaChapter({ mangaId, progress }: MangaSession, chapterIndex: number): void {
        const active = ViewerState.activeChapter;
        if (active?.mangaId === mangaId && active.chapterIndex === chapterIndex) return;
        const restore = chapterIndex === progress.currentChapter ? progress.scrollAnchor : undefined;
        viewer.load(chapterIndex, restore);
    }

    async function enterManga(mangaId: string, chapterIndex?: number): Promise<void> {
        const generation = routeGuard.next();
        const manga = getMangaList().find((entry) => entry.id === mangaId);
        if (!manga) {
            replaceRoute({ name: "library" });
            renderLibrary();
            return;
        }

        const session = openSession(mangaId);

        if (ViewerState.activeChapter?.mangaId === mangaId) {
            if (chapterIndex === undefined) {
                replaceRoute({ chapterIndex: ViewerState.activeChapter.chapterIndex, id: mangaId, name: "manga" });
            } else {
                loadMangaChapter(session, chapterIndex);
            }
            return;
        }

        const chapterCount = await refreshMangaFromDisk(manga.id);
        if (!routeGuard.isCurrent(generation)) return;

        if (chapterCount === null) {
            showAccessGate(manga);
            return;
        }

        accessGateModal.close();

        if (chapterIndex === undefined) {
            const decision = await resolveResumeChapter(session.progress);
            if (!routeGuard.isCurrent(generation)) return;
            replaceRoute({ chapterIndex: decision.chapterIndex, id: mangaId, name: "manga" });
            viewer.load(decision.chapterIndex, decision.restore);
            return;
        }

        loadMangaChapter(session, chapterIndex);
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
                            navigateTo({ name: "library" });
                        },
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
                closeOnBackdropClick: false,
                closeOnEscape: false,
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

    ViewerState.onChange("activeChapter", syncDocumentTitle);
    addEventListener("hashchange", handleRoute);
    if (!location.hash || location.hash === "#") replaceRoute({ name: "library" });
    handleRoute();
}
