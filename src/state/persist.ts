import {
    type ConfiguredMangaSettings,
    MANGA_SORT_ORDER_OPTIONS,
    type Manga,
    type MangaSortOrder,
    type ResolvedMangaProgress,
    SIDEBAR_MODES,
    type SidebarMode,
    THEME_PREFERENCE_OPTIONS,
    type ThemePreference,
} from "@/types";
import { createState } from "@/core/create-state";

export interface MangaStoreMap {
    mangaProgress: ResolvedMangaProgress;
    mangaSettings: ConfiguredMangaSettings;
}

function isOneOf<T extends string>(options: readonly (T | { value: T })[], value: unknown): value is T {
    return (
        typeof value === "string" &&
        options.some((option) => (typeof option === "string" ? option : option.value) === value)
    );
}

function isRecord<V>(value: unknown): value is Record<string, V> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withoutIds<T>(record: Record<string, T>, ids: readonly string[]): Record<string, T> | null {
    let changed = false;
    const next = { ...record };
    for (const id of ids) {
        if (id in next) {
            delete next[id];
            changed = true;
        }
    }
    return changed ? next : null;
}

const defaultState = {
    mangaList: [] as Manga[],
    mangaProgress: {} as Record<string, Partial<MangaStoreMap["mangaProgress"]>>,
    mangaSettings: {} as Record<string, Partial<MangaStoreMap["mangaSettings"]>>,
    mangaSortOrder: "custom" as MangaSortOrder,
    sidebarMode: "hover" as SidebarMode,
    themePreference: "system" as ThemePreference,
};

type PersistStateShape = typeof defaultState;

const properShape: { [K in keyof PersistStateShape]: (value: unknown) => value is PersistStateShape[K] } = {
    mangaList: (value): value is Manga[] => Array.isArray(value),
    mangaProgress: (value) => isRecord<Partial<MangaStoreMap["mangaProgress"]>>(value),
    mangaSettings: (value) => isRecord<Partial<MangaStoreMap["mangaSettings"]>>(value),
    mangaSortOrder: (value) => isOneOf(MANGA_SORT_ORDER_OPTIONS, value),
    sidebarMode: (value) => isOneOf(SIDEBAR_MODES, value),
    themePreference: (value) => isOneOf(THEME_PREFERENCE_OPTIONS, value),
};

export const PersistState = createState(defaultState, (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Failed to persist "${key}":`, error);
    }
});

function loadPersistState(): void {
    const loadedValues: Partial<PersistStateShape> = {};

    for (const key of Object.keys(properShape) as (keyof PersistStateShape)[]) {
        const saved = localStorage.getItem(key);
        if (saved === null) continue;

        let parsed: unknown;
        try {
            parsed = JSON.parse(saved);
        } catch (error) {
            console.error(`Failed to load "${key}":`, error);
            localStorage.removeItem(key);
            continue;
        }

        if (!properShape[key](parsed)) continue;
        (loadedValues as Record<string, unknown>)[key] = parsed;
    }

    PersistState.hydrate(loadedValues);
}

export function pruneMangaRecords(ids: readonly string[]): void {
    const progress = withoutIds(PersistState.mangaProgress, ids);
    if (progress) PersistState.update("mangaProgress", progress);

    const settings = withoutIds(PersistState.mangaSettings, ids);
    if (settings) PersistState.update("mangaSettings", settings);
}

loadPersistState();
