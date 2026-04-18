import { PersistState } from "./State";
import { getCurrentManga } from "./MangaLibrary";

let subscribers = new Set();

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

    notifySubscribers(mangaId, merged);
}

export function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

function notifySubscribers(mangaId, settings) {
    subscribers.forEach((cb) => cb(mangaId, settings));
}

export function getCurrentSettings() {
    const manga = getCurrentManga();
    return manga ? PersistState.mangaSettings[manga.id] || {} : {};
}
