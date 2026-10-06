import { type State, createState } from "@/core/create-state";
import { readOverrides, recordKey, writeOverrides } from "./storage";
import { PersistState } from "./persist";

export const DEFAULT_MANGA_PROGRESS = {
    currentChapter: 0,
    scrollAnchor: { index: 0, pageFraction: 0 },
    zoomLevel: 1,
};

export type MangaProgress = typeof DEFAULT_MANGA_PROGRESS;

const KIND = "progress";

export function hasProgress(progress: Pick<MangaProgress, "currentChapter" | "scrollAnchor">): boolean {
    return progress.currentChapter > 0 || progress.scrollAnchor.index > 0 || progress.scrollAnchor.pageFraction > 0;
}

export function readProgress(mangaId: string): MangaProgress {
    return { ...DEFAULT_MANGA_PROGRESS, ...readOverrides<MangaProgress>(recordKey(KIND, mangaId)) };
}

export function createProgressState(mangaId: string): State<MangaProgress> {
    const key = recordKey(KIND, mangaId);
    return createState(readProgress(mangaId), (field, value) => {
        if (!PersistState.mangaList.some((manga) => manga.id === mangaId)) return;
        writeOverrides(key, { ...readOverrides<MangaProgress>(key), [field]: value });
    });
}
