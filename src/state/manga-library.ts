import { PersistState, pruneMangaRecords } from "./persist";
import { forgetMangaFolders, getMangaChapterCount, invalidateMangaCache } from "./manga-files";
import type { Manga } from "@/types";
import { UIState } from "./ui";

export function getMangaList(): Manga[] {
    return PersistState.mangaList;
}

export function setMangaList(list: Manga[]): void {
    PersistState.update("mangaList", list);
}

export function getCurrentManga(): Manga | null {
    const id = PersistState.currentMangaId;
    if (id === null) return null;
    return getMangaList().find((manga) => manga.id === id) ?? null;
}

export function updateManga(mangaId: string, patch: Partial<Manga>): Manga | null {
    const list = getMangaList();
    const index = list.findIndex((manga) => manga.id === mangaId);
    const existing = list[index];
    if (!existing) return null;

    const keys = Object.keys(patch) as (keyof Manga)[];
    if (!keys.some((key) => patch[key] !== existing[key])) return existing;

    const updated = { ...existing, ...patch };
    const nextList = [...list];
    nextList[index] = updated;
    setMangaList(nextList);
    return updated;
}

export function deleteMangas(ids: readonly string[]): void {
    const doomed = new Set(ids);
    setMangaList(getMangaList().filter((manga) => !doomed.has(manga.id)));
    pruneMangaRecords(ids);
    void forgetMangaFolders(ids);

    UIState.update("isSelectEnabled", false);
    UIState.update("selectedMangaIds", []);
}

export async function refreshMangaFromDisk(mangaId: string): Promise<number | null> {
    invalidateMangaCache(mangaId);
    const count = await getMangaChapterCount(mangaId);
    if (count !== null) {
        updateManga(mangaId, { totalChapters: count });
    }
    return count;
}
