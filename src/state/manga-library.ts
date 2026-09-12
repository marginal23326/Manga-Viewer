import type { Manga } from "@/types";
import { PersistState } from "./persist";

export function getMangaList(): Manga[] {
    return PersistState.mangaList;
}

export function getCurrentManga(): Manga | null {
    const id = PersistState.currentMangaId;
    if (id === null) return null;
    return getMangaList().find((manga) => manga.id === id) ?? null;
}

export interface ChapterBounds {
    end: number;
    start: number;
    totalChapters: number;
}

export function syncMangaImageCount(mangaId: string, actualCount: number): void {
    const list = getMangaList();
    const index = list.findIndex((manga) => manga.id === mangaId);
    const manga = list[index];
    if (!manga || manga.totalImages === actualCount) return;

    const updatedList = [...list];
    updatedList[index] = { ...manga, totalImages: actualCount };
    PersistState.update("mangaList", updatedList);
}

export function getChapterBounds(manga: Manga | null | undefined, chapterIndex: number): ChapterBounds {
    if (!manga) {
        return { end: 0, start: 0, totalChapters: 0 };
    }

    const { totalChapters } = manga;

    if (chapterIndex < 0 || chapterIndex >= totalChapters) {
        return { end: 0, start: 0, totalChapters };
    }

    const basePages = Math.floor(manga.totalImages / totalChapters);
    const remainder = manga.totalImages % totalChapters;

    const start = chapterIndex * basePages + Math.min(chapterIndex, remainder);
    const count = basePages + (chapterIndex < remainder ? 1 : 0);
    const end = start + count;

    return { end, start, totalChapters };
}
