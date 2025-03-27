import '../css/styles.css';

// Import Core Modules
import Config from './core/Config';
import { AppState, loadInitialState } from './core/AppState';
import { cacheDOMelements } from './core/DOMUtils';
import { showSpinner, hideSpinner } from './core/Utils';

// Import UI/Feature Modules
import { initPasswordPrompt } from './components/PasswordPrompt'; // Placeholder
import { initTheme } from './ui/ThemeManager';
import { initAppLayout } from './ui/AppLayout';
import { initHomePageUI } from './ui/HomePageUI'; // Import Homepage UI
import { showHomepage } from './ui/ViewerUI';
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
    console.log("Initializing Manga Viewer...");
    showSpinner();

    loadInitialState();
    AppState.currentView = 'homepage';
    cacheDOMelements(); // Cache elements defined in index.html
    initTheme();
    initAppLayout(); // Prepare layout containers

    // Initialize Manga Manager (handles data logic)
    await initMangaManager(); // Ensure manga data is ready

    // Initialize UI Components that depend on data/layout
    initHomePageUI(); // Render homepage structure and initial manga list

    // --- Modules to be initialized later ---
    // initSidebar();
    // initNavigation();
    // initLightbox();
    // initSettings();
    // initViewerUI(); // Setup viewer elements (hidden initially)
    // initShortcuts();
    // --------------------------------------

    showHomepage(); // This ensures the correct container is visible

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