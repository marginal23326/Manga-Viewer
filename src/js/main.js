import '../css/styles.css';

// Import Core Modules
import Config from './core/Config';
import { AppState, loadInitialState } from './core/AppState';
import { DOM, cacheDOMelements } from './core/DOMUtils';
import { showSpinner, hideSpinner } from './core/Utils';

// Import UI/Feature Modules
import { initPasswordPrompt } from './components/PasswordPrompt'; // Placeholder
import { initTheme } from './ui/ThemeManager';
import { initAppLayout } from './ui/AppLayout';
import { initHomePageUI } from './ui/HomePageUI'; // Import Homepage UI
import { showHomepage, showViewer } from './ui/ViewerUI';
import { initMangaManager } from './features/MangaManager'; // Import Manga Manager
// Placeholders for modules to be added next
// import { initSidebar } from './features/SidebarManager';
// import { initNavigation } from './features/NavigationManager';
// import { initViewerUI } from './ui/ViewerUI';
// import { initSettings } from './features/SettingsManager';
// import { initShortcuts } from './ui/Shortcuts';
// import { initLightbox } from './components/Lightbox';

// --- Main Application Logic ---

async function initializeApp() {
    console.log("1. Initializing Manga Viewer..."); // Log Step 1
    showSpinner();

    console.log("2. Loading Initial State..."); // Log Step 2
    loadInitialState();

    console.log("3. Caching DOM Elements..."); // Log Step 3
    cacheDOMelements();
    console.log("   - DOM.homepageContainer:", DOM.homepageContainer); // Check if cached
    console.log("   - DOM.viewerContainer:", DOM.viewerContainer);   // Check if cached

    console.log("4. Initializing Theme..."); // Log Step 4
    initTheme();

    console.log("5. Initializing App Layout..."); // Log Step 5
    initAppLayout();

    console.log("6. Initializing Manga Manager..."); // Log Step 6
    await initMangaManager();

    console.log("7. Initializing Homepage UI..."); // Log Step 7
    initHomePageUI(); // This calls renderHomepageStructure and renderMangaList

    // --- Modules to be initialized later ---
    // initSidebar(); ... etc

    console.log("8. Setting Initial View..."); // Log Step 8
    // Explicitly show the correct view based on the loaded/default state
    if (AppState.currentView === 'viewer' && AppState.currentManga) {
        // If state says viewer AND there's a current manga loaded, show viewer
        showViewer();
    } else {
        // Otherwise, default to homepage
        if (AppState.currentView !== 'homepage') {
             // If state somehow got corrupted to something else, reset it
             AppState.update('currentView', 'homepage', false);
        }
        showHomepage(); // Explicitly show homepage
    }
    // We no longer need the AppState.update call here just for the initial view setting
    // AppState.update('currentView', AppState.currentView || 'homepage', false); // REMOVE or comment out this line

    hideSpinner();
    console.log("9. Manga Viewer Initialized.");
}

// --- Application Start --- (Password check remains the same)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (Config.PASSWORD_HASH && !AppState.isPasswordVerified) { // Check verification status
             initPasswordPrompt(Config.PASSWORD_HASH, initializeApp);
        } else {
            initializeApp();
        }
    });
} else {
    if (Config.PASSWORD_HASH && !AppState.isPasswordVerified) {
         initPasswordPrompt(Config.PASSWORD_HASH, initializeApp);
    } else {
        initializeApp();
    }
}