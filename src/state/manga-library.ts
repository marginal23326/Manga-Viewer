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

interface ChapterInfo {
    imagesPerChapter: number;
    totalChapters: number;
}

function getChapterInfo(totalImages: number, userProvidedTotalChapters: number): ChapterInfo {
    // Default to a single chapter if userProvidedTotalChapters is 0 or invalid.
    const imagesPerChapter =
        userProvidedTotalChapters > 0 ? Math.max(1, Math.round(totalImages / userProvidedTotalChapters)) : totalImages;

    // Guarantee at least one chapter.
    const totalChapters = imagesPerChapter > 0 ? Math.ceil(totalImages / imagesPerChapter) : 1;

    return { imagesPerChapter, totalChapters };
}

export function getTotalChapters(manga: Pick<Manga, "totalImages" | "userProvidedTotalChapters">): number {
    return getChapterInfo(manga.totalImages, manga.userProvidedTotalChapters).totalChapters;
}

export interface ChapterBounds {
    end: number;
    start: number;
}

export function getChapterBounds(manga: Manga | null | undefined, chapterIndex: number): ChapterBounds {
    if (!manga) {
        return { end: 0, start: 0 };
    }

    const { imagesPerChapter, totalChapters } = getChapterInfo(manga.totalImages, manga.userProvidedTotalChapters);
    if (!imagesPerChapter || chapterIndex < 0 || chapterIndex >= totalChapters) {
        return { end: 0, start: 0 };
    }

    const start = chapterIndex * imagesPerChapter;
    const end = Math.min(start + imagesPerChapter, manga.totalImages);

    return { end, start };
}
