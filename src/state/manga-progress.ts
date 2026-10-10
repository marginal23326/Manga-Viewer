import { type RecordKind, readOverrides, recordKey, writeOverrides } from "./storage";
import { PersistState } from "./persist";
import { deepEqual } from "@/core/utils";

export const DEFAULT_MANGA_PROGRESS = {
    currentChapter: 0,
    scrollAnchor: { index: 0, pageFraction: 0 },
};

export type MangaProgress = typeof DEFAULT_MANGA_PROGRESS;

const KIND: RecordKind = "progress";

export function hasProgress(progress: MangaProgress): boolean {
    return progress.currentChapter > 0 || progress.scrollAnchor.index > 0 || progress.scrollAnchor.pageFraction > 0;
}

export function readProgress(mangaId: string): MangaProgress {
    return { ...DEFAULT_MANGA_PROGRESS, ...readOverrides<MangaProgress>(recordKey(KIND, mangaId)) };
}

export function saveProgress(mangaId: string, patch: Partial<MangaProgress>): void {
    if (!PersistState.mangaList.some((manga) => manga.id === mangaId)) return;
    const key = recordKey(KIND, mangaId);
    const current = readOverrides<MangaProgress>(key);
    const next = { ...current, ...patch };
    if (!deepEqual(next, current)) writeOverrides(key, next);
}
