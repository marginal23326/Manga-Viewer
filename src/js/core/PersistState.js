import Config from "./Config";
import { createState } from "./createState";

const defaultState = {
    themePreference: "system",
    currentView: "homepage",
    mangaList: [],
    mangaSettings: {},
    currentMangaId: null,
    sidebarMode: "hover",
    mangaSortOrder: "custom",
};

export const PersistState = createState(defaultState, {
    eventTarget: new EventTarget(),
    onUpdate: (state, key, value) => {
        if (Config.LOCAL_STORAGE_KEYS[key]) {
            try {
                localStorage.setItem(Config.LOCAL_STORAGE_KEYS[key], JSON.stringify(value));
            } catch (e) {
                console.error(`Failed to persist "${key}":`, e);
            }
        }

        state.dispatchEvent(new CustomEvent(`state:${key}`, { detail: value }));
    },
});

PersistState.notify = function (key) {
    this.dispatchEvent(new CustomEvent(`state:${key}`, { detail: this[key] }));
};

export function loadPersistState() {
    Object.keys(Config.LOCAL_STORAGE_KEYS).forEach((key) => {
        const storageKey = Config.LOCAL_STORAGE_KEYS[key];
        const saved = localStorage.getItem(storageKey);
        if (saved === null) return;
        try {
            PersistState[key] = JSON.parse(saved);
        } catch (e) {
            console.error(`Failed to load "${storageKey}":`, e);
            localStorage.removeItem(storageKey);
        }
    });

    PersistState.mangaList = Array.isArray(PersistState.mangaList) ? PersistState.mangaList : [];
    PersistState.mangaSettings =
        typeof PersistState.mangaSettings === "object" && PersistState.mangaSettings !== null
            ? PersistState.mangaSettings
            : {};
}
