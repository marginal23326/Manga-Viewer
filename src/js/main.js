import '../css/styles.css';
import "smoothscroll-for-websites";

// Core
import Config from './core/Config';
import { AppState, loadInitialState } from './core/AppState';
import { cacheDOMelements, DOM } from './core/DOMUtils';
import { showSpinner, hideSpinner } from './core/Utils';
import { renderIcons } from './core/icons';

// Components & UI & Features
import { initPasswordPrompt } from './components/PasswordPrompt';
import { initTheme } from './ui/ThemeManager';
import { initAppLayout } from './ui/AppLayout';
import { initHomePageUI } from './ui/HomePageUI';
import { initShortcuts } from './ui/Shortcuts';
import { showHomepage, showViewer } from './ui/ViewerUI';
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

// --- Main Application Logic ---

async function initializeApp() {
    showSpinner();

    loadInitialState();
    cacheDOMelements();
    initTheme();
    initAppLayout();

    // Initialize static UI components
    initSidebar();
    initNavigation();
    initImageManager();
    initZoomManager();
    initChapterManager();
    initScrubberManager();
    initShortcuts();

    // Initialize Page-Specific UI
    initHomePageUI();

    // --- Modules to be initialized later ---
    // initViewerUI(); // Full init for viewer state/interactions
    // --------------------------------------

    // Set initial view
    if (AppState.currentView === 'viewer' && AppState.currentManga) {
        showViewer();
        const settings = loadMangaSettings(AppState.currentManga.id);
        setTimeout(() => loadChapterImages(settings.currentChapter || 0), 50);
    } else {
        showHomepage();
    }

    renderIcons(); 

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