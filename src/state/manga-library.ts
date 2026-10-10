import { forgetMangaFolders, getMangaChapterCount, invalidateMangaCache } from "./manga-files";
import type { Manga } from "@/types";
import { PersistState } from "./persist";
import { ViewerState } from "./viewer-state";
import { deleteMangaRecords } from "./storage";

export function getManga(id: string | null | undefined): Manga | null {
    return PersistState.mangaList.find((manga) => manga.id === id) ?? null;
}

export function getCurrentManga(): Manga | null {
    return getManga(ViewerState.currentMangaId);
}

export function updateManga(mangaId: string, patch: Partial<Manga>): void {
    PersistState.update(
        "mangaList",
        PersistState.mangaList.map((manga) => (manga.id === mangaId ? { ...manga, ...patch } : manga)),
    );
}

export function deleteMangas(ids: readonly string[]): void {
    const doomed = new Set(ids);
    PersistState.update(
        "mangaList",
        PersistState.mangaList.filter((manga) => !doomed.has(manga.id)),
    );
    deleteMangaRecords(ids);
    void forgetMangaFolders(ids);
}

export async function refreshMangaFromDisk(mangaId: string): Promise<number | null> {
    invalidateMangaCache(mangaId);
    const count = await getMangaChapterCount(mangaId);
    if (count !== null) updateManga(mangaId, { totalChapters: count });
    return count;
}
