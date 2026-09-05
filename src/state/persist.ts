import {
    CURRENT_VIEWS,
    type ConfiguredMangaSettings,
    type CurrentView,
    type ImagePattern,
    MANGA_SORT_ORDERS,
    type Manga,
    type MangaSortOrder,
    type ResolvedMangaProgress,
    SIDEBAR_MODES,
    type SidebarMode,
    THEME_PREFERENCES,
    type ThemePreference,
} from "@/types";
import { createState } from "@/core/create-state";

export interface MangaStoreMap {
    mangaProgress: ResolvedMangaProgress;
    mangaSettings: ConfiguredMangaSettings;
}

export interface PersistStateShape {
    currentMangaId: string | null;
    currentView: CurrentView;
    mangaImagePatterns: Record<string, ImagePattern>;
    mangaList: Manga[];
    mangaProgress: Record<string, Partial<MangaStoreMap["mangaProgress"]>>;
    mangaSettings: Record<string, Partial<MangaStoreMap["mangaSettings"]>>;
    mangaSortOrder: MangaSortOrder;
    sidebarMode: SidebarMode;
    themePreference: ThemePreference;
}

const defaultState: PersistStateShape = {
    currentMangaId: null,
    currentView: "homepage",
    mangaImagePatterns: {},
    mangaList: [],
    mangaProgress: {},
    mangaSettings: {},
    mangaSortOrder: "custom",
    sidebarMode: "hover",
    themePreference: "system",
};

function isOneOf<T extends string>(options: readonly T[], value: unknown): value is T {
    return typeof value === "string" && options.some((option) => option === value);
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

const properShape: { [K in keyof PersistStateShape]: (value: unknown) => value is PersistStateShape[K] } = {
    currentMangaId: (value): value is string => typeof value === "string",
    currentView: (value) => isOneOf(CURRENT_VIEWS, value),
    mangaImagePatterns: (value) => isRecord<ImagePattern>(value),
    mangaList: (value): value is Manga[] => Array.isArray(value),
    mangaProgress: (value) => isRecord<Partial<MangaStoreMap["mangaProgress"]>>(value),
    mangaSettings: (value) => isRecord<Partial<MangaStoreMap["mangaSettings"]>>(value),
    mangaSortOrder: (value) => isOneOf(MANGA_SORT_ORDERS, value),
    sidebarMode: (value) => isOneOf(SIDEBAR_MODES, value),
    themePreference: (value) => isOneOf(THEME_PREFERENCES, value),
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

loadPersistState();

export function pruneMangaRecords(ids: readonly string[]): void {
    const patterns = withoutIds(PersistState.mangaImagePatterns, ids);
    if (patterns) PersistState.update("mangaImagePatterns", patterns);

    const progress = withoutIds(PersistState.mangaProgress, ids);
    if (progress) PersistState.update("mangaProgress", progress);

    const settings = withoutIds(PersistState.mangaSettings, ids);
    if (settings) PersistState.update("mangaSettings", settings);
}
