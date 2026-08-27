import {
    CURRENT_VIEWS,
    type CurrentView,
    MANGA_SORT_ORDERS,
    type Manga,
    type MangaSortOrder,
    SIDEBAR_MODES,
    type SidebarMode,
    type StoredMangaSettings,
    THEME_PREFERENCES,
    type ThemePreference,
} from "@/types";
import { createState } from "@/core/create-state";

interface PersistStateShape {
    currentMangaId: string | null;
    currentView: CurrentView;
    mangaList: Manga[];
    mangaSettings: Record<string, StoredMangaSettings>;
    mangaSortOrder: MangaSortOrder;
    sidebarMode: SidebarMode;
    themePreference: ThemePreference;
}

const defaultState: PersistStateShape = {
    currentMangaId: null,
    currentView: "homepage",
    mangaList: [],
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

const properShape: { [K in keyof PersistStateShape]: (value: unknown) => value is PersistStateShape[K] } = {
    currentMangaId: (value): value is string => typeof value === "string",
    currentView: (value) => isOneOf(CURRENT_VIEWS, value),
    mangaList: (value): value is Manga[] => Array.isArray(value),
    mangaSettings: (value) => isRecord<StoredMangaSettings>(value),
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
