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

export function getCurrentManga(): Manga | null {
    const id = ViewerState.session?.mangaId;
    return getMangaList().find((manga) => manga.id === id) ?? null;
}

export function updateManga(mangaId: string, patch: Partial<Manga>): Manga | null {
    const list = getMangaList();
    const index = list.findIndex((manga) => manga.id === mangaId);
    const existing = list[index];
    if (!existing) return null;

    const updated = { ...existing, ...patch };
    const nextList = [...list];
    nextList[index] = updated;
    setMangaList(nextList);
    return updated;
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
