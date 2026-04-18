import { PersistState } from "./State";

export function getMangaList() {
    return PersistState.mangaList || [];
}

export function getCurrentManga() {
    const id = PersistState.currentMangaId;
    if (id == null) return null;
    return getMangaList().find((manga) => manga.id === id) || null;
}

export function withCurrentManga(onCurrentManga, onMissing) {
    const manga = getCurrentManga();
    if (!manga) {
        return onMissing?.();
    }
    return onCurrentManga(manga);
}
