import Config from "../core/Config";
import { createState } from "../core/createState";

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
        if (Config.PERSISTED_KEYS.includes(key)) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Failed to persist "${key}":`, error);
            }
        }

        state.dispatchEvent(new CustomEvent(`state:${key}`, { detail: value }));
    },
});

PersistState.notify = function (key) {
    this.dispatchEvent(new CustomEvent(`state:${key}`, { detail: this[key] }));
};

export function loadPersistState() {
    Config.PERSISTED_KEYS.forEach((key) => {
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
