import { PersistState } from "./State";
import { withCurrentManga } from "./MangaLibrary";

export function getSettings(mangaId) {
    if (!mangaId) return {};
    return { ...PersistState.mangaSettings[mangaId] };
}

export function updateSettings(mangaId, updates) {
    if (!mangaId) return;
    const merged = { ...PersistState.mangaSettings[mangaId], ...updates };
    PersistState.update("mangaSettings", { ...PersistState.mangaSettings, [mangaId]: merged });
}

export function getCurrentSettings() {
    return withCurrentManga(
        (manga) => PersistState.mangaSettings[manga.id] || {},
        () => ({}),
    );
}
