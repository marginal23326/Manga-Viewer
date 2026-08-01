import { PersistState } from "./State";
import { withCurrentManga } from "./MangaLibrary";

export function getSettings(mangaId) {
    if (!mangaId) return {};
    return { ...PersistState.mangaSettings[mangaId] };
}

export function updateSettings(mangaId, updates) {
    if (!mangaId) return;
    const current = PersistState.mangaSettings[mangaId] || {};
    const merged = { ...current, ...updates };

    PersistState.mangaSettings[mangaId] = merged;
    PersistState.update("mangaSettings", PersistState.mangaSettings);
}

export function getCurrentSettings() {
    return withCurrentManga(
        (manga) => PersistState.mangaSettings[manga.id] || {},
        () => ({}),
    );
}
