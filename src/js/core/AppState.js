import Config from './Config';
import { showSpinner, hideSpinner } from './Utils'; // Will create Utils next
import { showHomepage, showViewer } from '../ui/ViewerUI'; // Will create ViewerUI later

// Default state structure
const defaultState = {
    theme: Config.DEFAULT_THEME,
    currentView: 'homepage', // default view when the app loads
    mangaList: [],
    mangaSettings: {}, // { mangaId: { currentChapter: 0, scrollPosition: 0, zoomLevel: 1.0, ... } }
    currentManga: null, // The manga object being viewed
    isNavVisible: false,
    isSidebarExpanded: false,
    isChapterSelectorOpen: false,
    isLoading: false,
    isPasswordVerified: !Config.PASSWORD_HASH, // Assume verified if no hash set
    lightbox: { // State specific to the lightbox component
        isOpen: false,
        currentImageIndex: -1,
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

export const AppState = { ...defaultState };

// Function to update state and optionally save to localStorage
AppState.update = function(key, value, save = true) {
    // Basic check for nested updates (like lightbox)
    let changed = false;
    if (key.includes('.')) {
         const keys = key.split('.');
         let current = this;
         for (let i = 0; i < keys.length - 1; i++) {
             current = current[keys[i]];
             if (!current) return; // Parent object doesn't exist
         }
         if (current[keys[keys.length - 1]] !== value) {
             current[keys[keys.length - 1]] = value;
             changed = true;
         }
    } else if (this[key] !== value) {
        this[key] = value;
        changed = true;
    }


    if (changed) {
        // console.log(`State updated: ${key} =`, value); // DEBUG

        // Save relevant top-level keys to localStorage
        if (save && Config.LOCAL_STORAGE_KEYS[key] && !key.includes('.')) {
            try {
                localStorage.setItem(Config.LOCAL_STORAGE_KEYS[key], JSON.stringify(value));
            } catch (e) {
                console.error(`Failed to save state key "${key}" to localStorage:`, e);
            }
        }

        // --- Trigger UI updates based on state changes ---
        // This is a simple way; more complex apps might use event emitters or frameworks
        if (key === 'currentView') {
            if (value === 'homepage') showHomepage();
            else if (value === 'viewer') showViewer();
        }
        if (key === 'isLoading') {
            value ? showSpinner() : hideSpinner();
        }
        if (key === 'theme') {
            // Theme change is handled directly in ThemeManager.applyTheme
        }
        // Add more reactive updates if needed
        // Example: Update sidebar visibility based on isSidebarExpanded
        // Example: Update nav visibility based on isNavVisible
    }
};

// Function to load initial state from localStorage
export function loadInitialState() {
    Object.keys(Config.LOCAL_STORAGE_KEYS).forEach(key => {
        const storageKey = Config.LOCAL_STORAGE_KEYS[key];
        const savedValue = localStorage.getItem(storageKey);
        if (savedValue !== null) {
            try {
                // Directly assign to AppState, potentially overwriting defaults
                AppState[key] = JSON.parse(savedValue);
                console.log(`Loaded state from localStorage: ${key}`);
            } catch (e) {
                console.error(`Failed to parse localStorage key "${storageKey}":`, e);
                // Keep default value if parsing fails
                localStorage.removeItem(storageKey); // Remove corrupted data
            }
        }
    });
    // Ensure defaults for potentially missing or corrupted complex types
    AppState.mangaList = Array.isArray(AppState.mangaList) ? AppState.mangaList : [];
    AppState.mangaSettings = typeof AppState.mangaSettings === 'object' && AppState.mangaSettings !== null ? AppState.mangaSettings : {};
    AppState.theme = AppState.theme === 'light' ? 'light' : Config.DEFAULT_THEME; // Validate theme

    // Set initial password state
    AppState.isPasswordVerified = !Config.PASSWORD_HASH;
}