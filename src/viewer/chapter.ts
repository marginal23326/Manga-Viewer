import type { ChapterContext, Manga, ScrollAnchor } from "@/types";
import { type ChapterVirtualizer, mountVirtualizer } from "./virtualizer";
import {
    CurrentProgress,
    CurrentSettings,
    DEFAULT_MANGA_PROGRESS,
    ViewerState,
    getChapterPageCount,
    getCurrentManga,
    refreshMangaFromDisk,
} from "@/state";
import { clamp, createGenerationGuard, debounce } from "@/core/utils";
import { navigateTo, parseRoute, replaceRoute } from "@/app/hash-route";
import { h } from "@/core/dom-utils";

export interface ChapterView {
    readonly element: HTMLElement;
    load: (chapterIndex: number, restore?: ScrollAnchor) => void;
    reload: () => Promise<void>;
    scrollToIndex: (index: number, pageFraction?: number, behavior?: ScrollBehavior) => void;
    stepImage: (direction: number) => void;
    unload: () => void;
}

export type ScrollToIndex = ChapterView["scrollToIndex"];

export function getDoubleClickedPageIndex(event: MouseEvent): number | null {
    if (getImageClickZone(event.clientY) !== "middle") return null;
    return getLocalIndex(event.target);
}

function getLocalIndex(target: EventTarget | null): number | null {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>("[data-index]");
    if (!el?.dataset.index) return null;
    const n = Number(el.dataset.index);
    return Number.isNaN(n) ? null : n;
}

type ImageClickZone = "bottom" | "middle" | "top";

function getImageClickZone(clientY: number): ImageClickZone {
    const third = innerHeight / 3;
    if (clientY < third) return "top";
    if (clientY > third * 2) return "bottom";
    return "middle";
}

function handleImageClick(event: MouseEvent): void {
    const zone = getImageClickZone(event.clientY);
    if (zone === "middle") return;

    const direction = zone === "top" ? -1 : 1;
    scrollTo({
        behavior: "smooth",
        top: Math.max(0, scrollY + direction * CurrentSettings.scrollAmount),
    });
}

export function createChapterView(): ChapterView {
    const element = h("main", {
        className: "w-full px-2 sm:px-8 py-8 flex flex-col items-center bg-transparent relative z-10",
        id: "image-container",
    });
    const chapterLoadGuard = createGenerationGuard();
    let virtualizer: ChapterVirtualizer | null = null;

    function getScrollAnchor(): ScrollAnchor | null {
        return virtualizer?.getScrollAnchor() ?? null;
    }

    function scrollToIndex(index: number, pageFraction = 0, behavior: ScrollBehavior = "instant"): void {
        virtualizer?.scrollToIndex(index, pageFraction, behavior);
    }

    function stepImage(direction: number): void {
        const anchor = getScrollAnchor();
        if (anchor) scrollToIndex(anchor.index + direction, 0, "smooth");
    }

    function saveScrollPosition(): void {
        const anchor = getScrollAnchor();
        if (anchor && getCurrentManga()?.id === ViewerState.activeChapter?.mangaId) {
            CurrentProgress.update("scrollAnchor", anchor);
        }
    }

    function unload(): void {
        saveScrollPosition();
        ViewerState.update("activeChapter", null);
        virtualizer?.destroy();
        virtualizer = null;
    }

    function load(chapterIndex: number, restore?: ScrollAnchor): void {
        const manga = getCurrentManga();
        if (!manga) return;
        void loadChapterImagesForManga(manga, chapterIndex, restore);
    }

    async function loadChapterImagesForManga(
        manga: Manga,
        chapterIndex: number,
        restore?: ScrollAnchor,
    ): Promise<void> {
        if (chapterIndex !== 0 && (chapterIndex < 0 || chapterIndex >= manga.totalChapters)) {
            console.warn(`Invalid chapter index requested: ${chapterIndex}`);
            replaceRoute({ chapterIndex: 0, id: manga.id, name: "manga" });
            load(0);
            return;
        }

        const myGeneration = chapterLoadGuard.next();
        const scannedPageCount = await getChapterPageCount({ chapterIndex, mangaId: manga.id });
        if (!chapterLoadGuard.isCurrent(myGeneration)) return;
        if (getCurrentManga()?.id !== manga.id) return;
        if (scannedPageCount === null) {
            console.warn(`Failed to read chapter ${chapterIndex} for manga ${manga.id}`);
        }
        const pageCount = scannedPageCount ?? 0;

        unload();

        CurrentProgress.update("currentChapter", chapterIndex);
        if (!restore) {
            CurrentProgress.update("scrollAnchor", DEFAULT_MANGA_PROGRESS.scrollAnchor);
        }

        if (pageCount <= 0) return;

        const initialIndex = clamp(restore?.index ?? 0, 0, pageCount - 1);
        const initialFraction = restore?.index === initialIndex ? clamp(restore.pageFraction, 0, 1) : 0;

        const chapterContext: ChapterContext = {
            chapterIndex,
            mangaId: manga.id,
            pageCount,
        };

        ViewerState.update("visibleImageIndex", initialIndex);
        ViewerState.update("activeChapter", chapterContext);

        virtualizer = mountVirtualizer({
            container: element,
            context: chapterContext,
            initialFraction,
            initialIndex,
            onIndexChange: (localIndex) => {
                ViewerState.update("visibleImageIndex", localIndex);
            },
        });
    }

    async function reload(): Promise<void> {
        const manga = getCurrentManga();
        if (!manga || (await refreshMangaFromDisk(manga.id)) === null) return;
        load(CurrentProgress.currentChapter, getScrollAnchor() ?? undefined);
    }

    element.addEventListener("click", (event) => {
        if (getLocalIndex(event.target) !== null) handleImageClick(event);
    });

    const debouncedSaveScroll = debounce(saveScrollPosition, 300);
    addEventListener(
        "scroll",
        () => {
            if (ViewerState.currentMangaId !== null) debouncedSaveScroll();
        },
        { passive: true },
    );
    addEventListener("pagehide", saveScrollPosition, { capture: true });

    return {
        element,
        load,
        reload,
        scrollToIndex,
        stepImage,
        unload,
    };
}

export function goToChapter(chapterIndex: number): void {
    const manga = getCurrentManga();
    if (!manga || chapterIndex < 0 || chapterIndex >= manga.totalChapters) return;
    navigateTo({ chapterIndex, id: manga.id, name: "manga" });
}

function currentAddressChapter(): number {
    const route = parseRoute(location.hash);
    if (route.name === "manga" && route.chapterIndex !== undefined) return route.chapterIndex;
    return CurrentProgress.currentChapter;
}

export function loadNextChapter(): void {
    goToChapter(currentAddressChapter() + 1);
}

export function loadPreviousChapter(): void {
    goToChapter(currentAddressChapter() - 1);
}

export function goToLastChapter(): void {
    const manga = getCurrentManga();
    if (manga) goToChapter(manga.totalChapters - 1);
}
