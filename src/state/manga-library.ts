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
