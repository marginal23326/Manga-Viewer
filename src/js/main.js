import '../css/styles.css';

// Core
import Config from './core/Config';
import { AppState, loadInitialState } from './core/AppState';
import { cacheDOMelements, DOM } from './core/DOMUtils';
import { showSpinner, hideSpinner } from './core/Utils';
import { AppIcons } from './core/icons';
import { createIcons } from 'lucide';

// Components & UI & Features
import { initPasswordPrompt } from './components/PasswordPrompt';
import { initTheme } from './ui/ThemeManager';
import { initAppLayout } from './ui/AppLayout';
import { initHomePageUI } from './ui/HomePageUI';
import { showHomepage, showViewer } from './ui/ViewerUI'; // Keep imports
import { initMangaManager } from './features/MangaManager';
import { initSidebar } from './features/SidebarManager';
import { initNavigation } from './features/NavigationManager';
import { initImageManager } from './features/ImageManager';
import { initZoomManager } from './features/ZoomManager';
import { initChapterManager } from './features/ChapterManager';
import { initScrubberManager } from './features/ScrubberManager';
import { loadMangaSettings } from './features/SettingsManager';
import { loadChapterImages } from './features/ImageManager';
// Placeholders for modules to be added next
// import { initViewerUI } from './ui/ViewerUI'; // Full init
// import { initSettings } from './features/SettingsManager'; // Full init
// import { initShortcuts } from './ui/Shortcuts';
// import { initLightbox } from './components/Lightbox';

// --- Main Application Logic ---

async function initializeApp() {
    console.log("Initializing Manga Viewer...");
    showSpinner();

    loadInitialState();
    cacheDOMelements();
    initTheme();
    initAppLayout();

    await initMangaManager();

    // Initialize static UI components
    initSidebar();
    initNavigation();
    initImageManager();
    initZoomManager();
    initChapterManager();
    initScrubberManager();

    // Initialize Page-Specific UI
    initHomePageUI();

    // --- Modules to be initialized later ---
    // initSettings();
    // initViewerUI(); // Full init for viewer state/interactions
    // initShortcuts();
    // initLightbox();
    // --------------------------------------

    // Set initial view
    if (AppState.currentView === 'viewer' && AppState.currentManga) {
        showViewer();
        const settings = loadMangaSettings(AppState.currentManga.id);
        setTimeout(() => loadChapterImages(settings.currentChapter || 0), 50);
    } else {
        showHomepage();
    }

    if (DOM.app) { createIcons({ icons: AppIcons, context: DOM.app }); }

    hideSpinner();
}

// --- Application Start ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (Config.PASSWORD_HASH && !AppState.isPasswordVerified) {
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