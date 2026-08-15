import { PersistState } from "./persist";
import type { StoredMangaSettings } from "@/types";
import { getCurrentManga } from "./manga-library";

export function getSettings(mangaId: string | null): StoredMangaSettings {
    if (!mangaId) return {};
    return { ...PersistState.mangaSettings[mangaId] };
}

export function updateSettings(mangaId: string | null, updates: StoredMangaSettings): void {
    if (!mangaId) return;
    const merged = { ...PersistState.mangaSettings[mangaId], ...updates };
    PersistState.update("mangaSettings", { ...PersistState.mangaSettings, [mangaId]: merged });
}

export function getCurrentSettings(): StoredMangaSettings {
    const manga = getCurrentManga();
    return manga ? getSettings(manga.id) : {};
}

export function updateCurrentSettings(updates: StoredMangaSettings): void {
    const manga = getCurrentManga();
    if (manga) updateSettings(manga.id, updates);
}
