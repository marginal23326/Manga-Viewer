import { readJson, recordKey } from "./storage";
import type { ResolvedMangaProgress } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_PROGRESS: ResolvedMangaProgress = Object.freeze({
    currentChapter: 0,
    scrollAnchor: Object.freeze({ index: 0, pageFraction: 0 }),
    zoomLevel: 1,
});

export const CurrentProgress = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "progress");

export function getSavedProgress(mangaId: string): ResolvedMangaProgress {
    const stored = readJson(recordKey("progress", mangaId));
    const overrides = typeof stored === "object" && stored !== null && !Array.isArray(stored) ? stored : {};
    return { ...DEFAULT_MANGA_PROGRESS, ...overrides };
}
