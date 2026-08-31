import type { ImagePattern, ResolvedMangaProgress } from "@/types";
import { PersistState } from "./persist";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_PROGRESS: ResolvedMangaProgress = {
    currentChapter: 0,
    imagePattern: undefined,
    scrollIndex: 0,
    scrollOffset: 0,
    zoomLevel: 1,
};

export const ProgressStore = createMangaScopedStore(DEFAULT_MANGA_PROGRESS, "mangaProgress");

export const CurrentProgress = ProgressStore.state;

export function setStoredImagePattern(mangaId: string, imagePattern: ImagePattern): void {
    if (ProgressStore.isActive(mangaId)) {
        CurrentProgress.update("imagePattern", imagePattern);
        return;
    }
    const records = PersistState.mangaProgress;
    PersistState.update("mangaProgress", {
        ...records,
        [mangaId]: { ...records[mangaId], imagePattern },
    });
}
