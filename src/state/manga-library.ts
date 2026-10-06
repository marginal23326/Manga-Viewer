import { forgetMangaFolders, getMangaChapterCount, invalidateMangaCache } from "./manga-files";
import type { Manga } from "@/types";
import { PersistState } from "./persist";
import { ViewerState } from "./viewer-state";
import { deleteMangaRecords } from "./storage";

export function getMangaList(): Manga[] {
    return PersistState.mangaList;
}

export function setMangaList(list: Manga[]): void {
    PersistState.update("mangaList", list);
}

export function getManga(id: string | null | undefined): Manga | null {
    return getMangaList().find((manga) => manga.id === id) ?? null;
}

export function getCurrentManga(): Manga | null {
    return getManga(ViewerState.session?.mangaId);
}

export function updateManga(mangaId: string, patch: Partial<Manga>): void {
    setMangaList(getMangaList().map((manga) => (manga.id === mangaId ? { ...manga, ...patch } : manga)));
}

export function deleteMangas(ids: readonly string[]): void {
    const doomed = new Set(ids);
    setMangaList(getMangaList().filter((manga) => !doomed.has(manga.id)));
    deleteMangaRecords(ids);
    void forgetMangaFolders(ids);
}

export async function refreshMangaFromDisk(mangaId: string): Promise<number | null> {
    invalidateMangaCache(mangaId);
    const count = await getMangaChapterCount(mangaId);
    if (count !== null) {
        updateManga(mangaId, { totalChapters: count });
    }
    return count;
}
