import type { ResolvedMangaProgress } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_PROGRESS: ResolvedMangaProgress = Object.freeze({
    currentChapter: 0,
    scrollAnchor: Object.freeze({ index: 0, pageFraction: 0 }),
    zoomLevel: 1,
});

export const CurrentProgress = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "mangaProgress");
