import type { ImagePattern, ResolvedMangaSettings, StoredMangaSettings } from "@/types";
import { PersistState } from "./persist";
import { createState } from "@/core/create-state";
import { deepEqual } from "@/core/utils";

export const DEFAULT_MANGA_SETTINGS: ResolvedMangaSettings = {
    autoScrollEnabled: false,
    autoScrollSpeed: 50,
    collapseSpacing: false,
    currentChapter: 0,
    imageFit: "original",
    imagePattern: undefined,
    navBarEnabled: true,
    progressBarEnabled: true,
    progressBarPosition: "bottom",
    progressBarStyle: "discrete",
    resumeMode: "ask",
    scrollAmount: 300,
    scrollIndex: 0,
    scrollOffset: 0,
    scrubberEnabled: true,
    spacingAmount: 30,
    zoomLevel: 1,
};

export const CurrentSettings = createState(DEFAULT_MANGA_SETTINGS, scheduleFlush);

const SETTING_KEYS = Object.keys(DEFAULT_MANGA_SETTINGS) as (keyof ResolvedMangaSettings)[];

let activeMangaId: string | null = null;
let flushScheduled = false;
let flushHeld = false;

function sparseRecord(): StoredMangaSettings {
    const record: StoredMangaSettings = {};
    for (const key of SETTING_KEYS) {
        const value = CurrentSettings[key];
        if (!deepEqual(value, DEFAULT_MANGA_SETTINGS[key])) {
            (record as Record<string, unknown>)[key] = value;
        }
    }
    return record;
}

function flush(): void {
    const mangaId = activeMangaId;
    if (!mangaId || flushHeld) return;

    const records = PersistState.mangaSettings;
    const sparse = sparseRecord();
    if (deepEqual(records[mangaId] ?? {}, sparse)) return;

    const next = { ...records };
    if (Object.keys(sparse).length > 0) next[mangaId] = sparse;
    else delete next[mangaId];
    PersistState.update("mangaSettings", next);
}

function scheduleFlush(): void {
    if (flushScheduled || flushHeld || !activeMangaId) return;
    flushScheduled = true;
    queueMicrotask(() => {
        flushScheduled = false;
        flush();
    });
}

export function beginSettingsDraft(): void {
    flushHeld = true;
}

export function endSettingsDraft(): void {
    flushHeld = false;
    scheduleFlush();
}

export function applySnapshot(settings: ResolvedMangaSettings): void {
    CurrentSettings.hydrate(settings);
}

function activate(mangaId: string | null): void {
    if (activeMangaId) flush();

    activeMangaId = mangaId;
    applySnapshot({
        ...DEFAULT_MANGA_SETTINGS,
        ...(mangaId ? PersistState.mangaSettings[mangaId] : undefined),
    });
}

PersistState.onChange("currentMangaId", activate);
activate(PersistState.currentMangaId);

export function getStoredImagePattern(mangaId: string): ImagePattern | undefined {
    return PersistState.mangaSettings[mangaId]?.imagePattern;
}

export function setStoredImagePattern(mangaId: string, imagePattern: ImagePattern): void {
    if (mangaId === activeMangaId) {
        CurrentSettings.update("imagePattern", imagePattern);
        return;
    }
    const records = PersistState.mangaSettings;
    PersistState.update("mangaSettings", {
        ...records,
        [mangaId]: { ...records[mangaId], imagePattern },
    });
}
