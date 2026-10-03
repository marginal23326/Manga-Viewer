import { createMangaScopedStore, readOverrides } from "./manga-scoped-store";
import type { ResolvedMangaProgress } from "@/types";
import { recordKey } from "./storage";

export const DEFAULT_MANGA_PROGRESS: ResolvedMangaProgress = Object.freeze({
    currentChapter: 0,
    scrollAnchor: Object.freeze({ index: 0, pageFraction: 0 }),
    zoomLevel: 1,
});

export const CurrentProgress = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "progress");

export function getSavedProgress(mangaId: string): ResolvedMangaProgress {
    return { ...DEFAULT_MANGA_PROGRESS, ...readOverrides<ResolvedMangaProgress>(recordKey("progress", mangaId)) };
}
