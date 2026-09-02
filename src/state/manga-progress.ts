import type { ResolvedMangaProgress } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_PROGRESS: ResolvedMangaProgress = {
    currentChapter: 0,
    scrollIndex: 0,
    scrollOffset: 0,
    zoomLevel: 1,
};

export const ProgressStore = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "mangaProgress");

export const CurrentProgress = ProgressStore.state;
