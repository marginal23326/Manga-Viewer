import { PersistState } from "./persist";
import type { StoredMangaSettings } from "@/types";
import { withCurrentManga } from "./manga-library";

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
    return withCurrentManga(
        (manga) => getSettings(manga.id),
        () => ({}),
    );
}
