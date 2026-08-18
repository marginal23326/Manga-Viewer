import type { ResolvedMangaSettings, StoredMangaSettings } from "@/types";
import { PersistState } from "./persist";
import { getCurrentManga } from "./manga-library";

export const DEFAULT_MANGA_SETTINGS: ResolvedMangaSettings = {
    autoScrollEnabled: false,
    autoScrollSpeed: 50,
    collapseSpacing: false,
    currentChapter: 0,
    imageFit: "original",
    navBarEnabled: true,
    progressBarEnabled: true,
    progressBarPosition: "bottom",
    progressBarStyle: "discrete",
    scrollAmount: 300,
    scrollPosition: 0,
    scrubberEnabled: true,
    spacingAmount: 30,
    zoomLevel: 1,
};

export function getSettings(mangaId: string | null): ResolvedMangaSettings {
    if (!mangaId) return { ...DEFAULT_MANGA_SETTINGS };
    return { ...DEFAULT_MANGA_SETTINGS, ...PersistState.mangaSettings[mangaId] };
}

export function updateSettings(mangaId: string | null, updates: StoredMangaSettings): void {
    if (!mangaId) return;
    const merged = { ...PersistState.mangaSettings[mangaId], ...updates };
    PersistState.update("mangaSettings", { ...PersistState.mangaSettings, [mangaId]: merged });
}

export function getCurrentSettings(): ResolvedMangaSettings {
    const manga = getCurrentManga();
    return manga ? getSettings(manga.id) : { ...DEFAULT_MANGA_SETTINGS };
}

export function updateCurrentSettings(updates: StoredMangaSettings): void {
    const manga = getCurrentManga();
    if (manga) updateSettings(manga.id, updates);
}
