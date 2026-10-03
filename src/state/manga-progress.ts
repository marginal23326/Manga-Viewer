import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_PROGRESS = {
    currentChapter: 0,
    scrollAnchor: { index: 0, pageFraction: 0 },
    zoomLevel: 1,
};

export type MangaProgress = typeof DEFAULT_MANGA_PROGRESS;

export function hasProgress(progress: Pick<MangaProgress, "currentChapter" | "scrollAnchor">): boolean {
    return progress.currentChapter > 0 || progress.scrollAnchor.index > 0 || progress.scrollAnchor.pageFraction > 0;
}

export const CurrentProgress = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "progress");
