import {
    MANGA_SORT_ORDER_OPTIONS,
    type Manga,
    type MangaSortOrder,
    THEME_PREFERENCE_OPTIONS,
    TOOLBAR_MODES,
    type ThemePreference,
    type ToolbarMode,
} from "@/types";
import { readJson, writeJson } from "./storage";
import { createState } from "@/core/create-state";

function isOneOf<T extends string>(options: readonly (T | { value: T })[], value: unknown): value is T {
    return (
        typeof value === "string" &&
        options.some((option) => (typeof option === "string" ? option : option.value) === value)
    );
}

const defaultState = {
    mangaList: [] as Manga[],
    mangaSortOrder: "custom" as MangaSortOrder,
    themePreference: "system" as ThemePreference,
    toolbarMode: "hover" as ToolbarMode,
};

type PersistStateShape = typeof defaultState;

const properShape: { [K in keyof PersistStateShape]: (value: unknown) => value is PersistStateShape[K] } = {
    mangaList: (value): value is Manga[] => Array.isArray(value),
    mangaSortOrder: (value) => isOneOf(MANGA_SORT_ORDER_OPTIONS, value),
    themePreference: (value) => isOneOf(THEME_PREFERENCE_OPTIONS, value),
    toolbarMode: (value) => isOneOf(TOOLBAR_MODES, value),
};

export const PersistState = createState(defaultState, writeJson);

function loadPersistState(): void {
    const loadedValues: Partial<PersistStateShape> = {};

    for (const key of Object.keys(properShape) as (keyof PersistStateShape)[]) {
        const parsed = readJson(key);
        if (parsed === undefined || !properShape[key](parsed)) continue;
        (loadedValues as Record<string, unknown>)[key] = parsed;
    }

    PersistState.hydrate(loadedValues);
}

loadPersistState();
