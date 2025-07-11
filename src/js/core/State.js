import Config from "./Config";

// Default state structure
const defaultState = {
    themePreference: "system",
    currentView: "homepage", // default view when the app loads
    mangaList: [],
    mangaSettings: {}, // { mangaId: { currentChapter: 0, scrollPosition: 0, zoomLevel: 1.0, ... } }
    currentManga: null, // The manga object being viewed
    sidebarMode: "hover", // 'hover', 'open', 'closed'
    mangaSortOrder: "custom", // Default sort order
    isNavVisible: false,
    isChapterSelectorOpen: false,
    isAutoScrolling: false,
    isPasswordVerified: !Config.PASSWORD_HASH, // Assume verified if no hash set
    isSelectModeEnabled: false,
    selectedMangaIds: [],
    lightbox: { // State specific to the lightbox component
        isOpen: false,
        currentImageIndex: -1,
        multiSelect: {},
        isDragging: false,
        startX: 0,
        startY: 0,
        startTranslateX: 0,
        startTranslateY: 0,
        currentTranslateX: 0,
        currentTranslateY: 0,
        currentScale: 1,
    },
    // Add other global states as needed
};

export const State = { ...defaultState };

// Function to update state and optionally save to localStorage
State.update = function (key, value, save = true) {
    // Basic check for nested updates (like lightbox)
    let changed = false;
    if (key.includes(".")) {
        const keys = key.split(".");
        let current = this;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
            if (!current) return false; // No change if path invalid
        }
        if (current[keys[keys.length - 1]] !== value) {
            current[keys[keys.length - 1]] = value;
            changed = true;
        }
    } else {
        const isPotentiallyMutatedObject = key === "mangaSettings" || key === "mangaList";
        if (isPotentiallyMutatedObject || this[key] !== value) {
            this[key] = value;
            changed = true;
        }
    }

    if (changed) {
        // console.log(`State updated: ${key} =`, value); // DEBUG

        // Save relevant top-level keys to localStorage
        if (save && Config.LOCAL_STORAGE_KEYS[key] && !key.includes(".")) {
            try {
                localStorage.setItem(Config.LOCAL_STORAGE_KEYS[key], JSON.stringify(value));
            } catch (e) {
                console.error(`Failed to save state key "${key}" to localStorage:`, e);
            }
        }
        return true; // Changed
    }
    return false; // Not changed
};

// Function to load initial state from localStorage
export function loadInitialState() {
    Object.keys(Config.LOCAL_STORAGE_KEYS).forEach((key) => {
        const storageKey = Config.LOCAL_STORAGE_KEYS[key];
        const savedValue = localStorage.getItem(storageKey);
        if (savedValue !== null) {
            try {
                // Directly assign to State, potentially overwriting defaults
                State[key] = JSON.parse(savedValue);
            } catch (e) {
                console.error(`Failed to parse localStorage key "${storageKey}":`, e);
                // Keep default value if parsing fails
                localStorage.removeItem(storageKey); // Remove corrupted data
            }
        }
    });
    // Ensure defaults for potentially missing or corrupted complex types
    State.mangaList = Array.isArray(State.mangaList) ? State.mangaList : [];
    State.mangaSettings = typeof State.mangaSettings === "object" && State.mangaSettings !== null ? State.mangaSettings : {};

    // Set initial password state
    State.isPasswordVerified = !Config.PASSWORD_HASH;
}
