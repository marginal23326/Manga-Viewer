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
import { showHomepage, showViewer, initViewerUI } from './ui/ViewerUI';
import { initSidebar } from './features/SidebarManager';
import { initNavigation } from './features/NavigationManager';
import { initImageManager } from './features/ImageManager';
import { initZoomManager } from './features/ZoomManager';
import { initChapterManager } from './features/ChapterManager';
import { initScrubberManager } from './features/ScrubberManager';
import { loadMangaSettings } from './features/SettingsManager';
import { loadChapterImages } from './features/ImageManager';

// --- Main Application Logic ---

async function initializeApp() {
    showSpinner();

    loadInitialState();
    cacheDOMelements();
    initTheme();
    initAppLayout();

    // Initialize static UI components and managers
    initSidebar();
    initNavigation();
    initImageManager();
    initZoomManager();
    initChapterManager();
    initScrubberManager();
    initShortcuts();
    initViewerUI();

    initHomePageUI();

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
function start() {
    if (Config.PASSWORD_HASH && !AppState.isPasswordVerified) {
         initPasswordPrompt(Config.PASSWORD_HASH, initializeApp);
    } else {
        initializeApp();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}