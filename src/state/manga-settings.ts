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

/**
 * Live, reactive view of the open manga's settings and reading progress.
 *
 * Viewer widgets subscribe to the keys they render and re-apply themselves on
 * change — there are no imperative "apply" calls anywhere. Opening a manga
 * hydrates the store from its stored record (see `activate` below); writing a
 * key updates widgets immediately and is persisted back sparsely: only values
 * that differ from the defaults are kept in the record.
 */
export const CurrentSettings = createState(DEFAULT_MANGA_SETTINGS);

const SETTING_KEYS = Object.keys(DEFAULT_MANGA_SETTINGS) as (keyof ResolvedMangaSettings)[];

let activeMangaId: string | null = null;
let flushScheduled = false;
let flushHeld = false;

/** The live store reduced to a stored record: only non-default values. */
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
    if (flushScheduled || !activeMangaId) return;
    flushScheduled = true;
    queueMicrotask(() => {
        flushScheduled = false;
        flush();
    });
}

for (const key of SETTING_KEYS) CurrentSettings.onChange(key, scheduleFlush);

/**
 * Opens/closes a draft window (the settings modal) during which store
 * mutations apply live to the UI but persistence waits until the draft ends.
 * Rollback needs no special handling: it just restores the pre-draft snapshot,
 * and the idempotent flush turns that into a no-op write.
 */
export function beginSettingsDraft(): void {
    flushHeld = true;
}

export function endSettingsDraft(): void {
    flushHeld = false;
    scheduleFlush();
}

export function applySnapshot(settings: ResolvedMangaSettings): void {
    if (!activeMangaId) {
        CurrentSettings.hydrate(settings);
        return;
    }
    for (const key of SETTING_KEYS) CurrentSettings.update(key, settings[key]);
}

function activate(mangaId: string | null): void {
    if (activeMangaId) flush();

    activeMangaId = mangaId;
    applySnapshot({
        ...DEFAULT_MANGA_SETTINGS,
        ...(mangaId ? PersistState.mangaSettings[mangaId] : undefined),
    });
}

// Entering or leaving a manga retargets the live store onto that manga.
PersistState.onChange("currentMangaId", activate);

export function initCurrentSettings(): void {
    activate(PersistState.currentMangaId);
}

// The resolved image pattern is probed/written for any manga (e.g. library
// covers), so it also needs record-level access outside the open manga.
export function getStoredImagePattern(mangaId: string): ImagePattern | undefined {
    return PersistState.mangaSettings[mangaId]?.imagePattern;
}

export function setStoredImagePattern(mangaId: string, imagePattern: ImagePattern): void {
    if (mangaId === activeMangaId) {
        // Go through the live store so the next flush keeps the record in sync.
        CurrentSettings.update("imagePattern", imagePattern);
        return;
    }
    const records = PersistState.mangaSettings;
    PersistState.update("mangaSettings", {
        ...records,
        [mangaId]: { ...records[mangaId], imagePattern },
    });
}
