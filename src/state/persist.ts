import {
    MANGA_SORT_FIELD_OPTIONS,
    type Manga,
    type MangaSortDir,
    type MangaSortField,
    THEME_PREFERENCE_OPTIONS,
    type ThemePreference,
} from "@/types";
import { readJson, writeJson } from "./storage";
import { createState } from "@/core/create-state";

function isOneOf<T extends string>(options: readonly { value: T }[], value: unknown): value is T {
    return options.some((option) => option.value === value);
}

const defaultState = {
    mangaList: [] as Manga[],
    mangaSortDir: "asc" as MangaSortDir,
    mangaSortField: "custom" as MangaSortField,
    themePreference: "system" as ThemePreference,
    toolbarPinned: false,
};

type PersistStateShape = typeof defaultState;

const properShape: { [K in keyof PersistStateShape]: (value: unknown) => value is PersistStateShape[K] } = {
    mangaList: (value): value is Manga[] => Array.isArray(value),
    mangaSortDir: (value): value is MangaSortDir => value === "asc" || value === "desc",
    mangaSortField: (value) => isOneOf(MANGA_SORT_FIELD_OPTIONS, value),
    themePreference: (value) => isOneOf(THEME_PREFERENCE_OPTIONS, value),
    toolbarPinned: (value): value is boolean => typeof value === "boolean",
};

export const PersistState = createState(defaultState, writeJson);

export function toggleToolbarPin(): void {
    PersistState.update("toolbarPinned", !PersistState.toolbarPinned);
}

const loadedValues: Partial<PersistStateShape> = {};

for (const key of Object.keys(properShape) as (keyof PersistStateShape)[]) {
    const parsed = readJson(key);
    if (!properShape[key](parsed)) continue;
    (loadedValues as Record<string, unknown>)[key] = parsed;
}

PersistState.hydrate(loadedValues);
