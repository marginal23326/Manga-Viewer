import type { ChapterContext } from "@/types";
import { CurrentSettings } from "./manga-settings";
import { createState } from "@/core/create-state";

interface ViewerStateShape {
    activeChapter: ChapterContext | null;
    autoScroll: boolean;
    currentMangaId: string | null;
    lightboxIndex: number | null;
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    activeChapter: null,
    autoScroll: false,
    currentMangaId: null,
    lightboxIndex: null,
    visibleImageIndex: 0,
});

export function setCurrentManga(mangaId: string | null): void {
    if (ViewerState.currentMangaId === mangaId) return;
    CurrentSettings.setScope(mangaId);
    ViewerState.update("currentMangaId", mangaId);
}
