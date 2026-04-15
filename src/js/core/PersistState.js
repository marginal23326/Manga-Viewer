import Config from "./Config";

const defaultState = {
    themePreference: "system",
    currentView: "homepage",
    mangaList: [],
    mangaSettings: {},
    currentMangaId: null,
    sidebarMode: "hover",
    mangaSortOrder: "custom",
};

const eventTarget = new EventTarget();
export const PersistState = Object.assign(eventTarget, defaultState);

PersistState.update = function (key, value) {
    const isPotentiallyMutatedObject = key === "mangaSettings" || key === "mangaList";
    if (!isPotentiallyMutatedObject) {
        const oldSerialized = JSON.stringify(this[key]);
        const newSerialized = JSON.stringify(value);
        if (oldSerialized === newSerialized) return false;
    }
    this[key] = value;

    if (Config.LOCAL_STORAGE_KEYS[key]) {
        try {
            localStorage.setItem(Config.LOCAL_STORAGE_KEYS[key], JSON.stringify(value));
        } catch (e) {
            console.error(`Failed to persist "${key}":`, e);
        }
    }

    this.dispatchEvent(new CustomEvent(`state:${key}`, { detail: value }));
    return true;
};

PersistState.saveAll = function () {
    Object.keys(Config.LOCAL_STORAGE_KEYS).forEach((key) => {
        if (this[key] !== undefined) {
            try {
                localStorage.setItem(Config.LOCAL_STORAGE_KEYS[key], JSON.stringify(this[key]));
            } catch (e) {
                console.error(`Failed to persist "${key}":`, e);
            }
        }
    });
};

export function loadPersistState() {
    Object.keys(Config.LOCAL_STORAGE_KEYS).forEach((key) => {
        const storageKey = Config.LOCAL_STORAGE_KEYS[key];
        const saved = localStorage.getItem(storageKey);
        try {
            PersistState[key] = JSON.parse(saved);
        } catch (e) {
            if (saved !== null) {
                console.error(`Failed to load "${storageKey}":`, e);
                localStorage.removeItem(storageKey);
            }
        }
    });

    PersistState.mangaList = Array.isArray(PersistState.mangaList) ? PersistState.mangaList : [];
    PersistState.mangaSettings =
        typeof PersistState.mangaSettings === "object" && PersistState.mangaSettings !== null
            ? PersistState.mangaSettings
            : {};
}
