import type { Manga } from "@/types";
import { PersistState } from "./persist-state";

export function getMangaList(): Manga[] {
    return PersistState.mangaList;
}

export function getCurrentManga(): Manga | null {
    const id = PersistState.currentMangaId;
    if (id === null) return null;
    return getMangaList().find((manga) => manga.id === id) ?? null;
}

export function withCurrentManga<T>(onCurrentManga: (manga: Manga) => T, onMissing: () => T): T;
export function withCurrentManga<T>(onCurrentManga: (manga: Manga) => T): T | undefined;
export function withCurrentManga<T>(onCurrentManga: (manga: Manga) => T, onMissing?: () => T): T | undefined {
    const manga = getCurrentManga();
    return manga ? onCurrentManga(manga) : onMissing?.();
}
