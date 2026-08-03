import { createState } from "../core/create-state";

const defaultState = {
    currentMangaId: null,
    currentView: "homepage",
    mangaList: [],
    mangaSettings: {},
    mangaSortOrder: "custom",
    sidebarMode: "hover",
    themePreference: "system",
};

export const PersistState = createState(defaultState, {
    eventTarget: new EventTarget(),
    onUpdate: (state, key, value) => {
        if (key in defaultState) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Failed to persist "${key}":`, error);
            }
        } else {
            console.error(`"${key}" is not a persisted state key.`);
        }

        state.dispatchEvent(new CustomEvent(`state:${key}`, { detail: value }));
    },
});

PersistState.notify = function notify(key) {
    this.dispatchEvent(new CustomEvent(`state:${key}`, { detail: this[key] }));
};

export function loadPersistState() {
    Object.keys(defaultState).forEach((key) => {
        const saved = localStorage.getItem(key);
        if (saved === null) return;
        try {
            PersistState[key] = JSON.parse(saved);
        } catch (error) {
            console.error(`Failed to load "${key}":`, error);
            localStorage.removeItem(key);
        }
    });

    PersistState.mangaList = Array.isArray(PersistState.mangaList) ? PersistState.mangaList : [];
    PersistState.mangaSettings =
        typeof PersistState.mangaSettings === "object" && PersistState.mangaSettings !== null
            ? PersistState.mangaSettings
            : {};
}
