import type { ResolvedMangaProgress } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_PROGRESS: ResolvedMangaProgress = {
    currentChapter: 0,
    scrollAnchor: { index: 0, offset: 0 },
    zoomLevel: 1,
};

export const ProgressStore = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "mangaProgress");

export const CurrentProgress = ProgressStore.state;
