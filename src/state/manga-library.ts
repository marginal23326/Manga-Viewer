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
    PersistState.update("mangaList", nextList);
    return updated;
}
