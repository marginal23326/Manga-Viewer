import '../css/styles.css';
import "smoothscroll-for-websites";

import Config from './core/Config';
import { AppState, loadInitialState } from './core/AppState';
import { cacheDOMelements, DOM } from './core/DOMUtils';
import { showSpinner, hideSpinner } from './core/Utils';

import { initPasswordPrompt } from './components/PasswordPrompt';
import { initTheme } from './ui/ThemeManager';
import { initAppLayout } from './ui/AppLayout';
import { initHomePageUI } from './ui/HomePageUI';
import { initShortcuts } from './ui/Shortcuts';
import { initViewerState } from './ui/ViewerUI';
import { initSidebar } from './features/SidebarManager';
import { initNavigation } from './features/NavigationManager';
import { initImageManager } from './features/ImageManager';
import { initZoomManager } from './features/ZoomManager';
import { initChapterManager } from './features/ChapterManager';
import { initScrubberManager } from './features/ScrubberManager';

async function initializeApp() {
    showSpinner();

    // Initialize managers and UI components
    initAppLayout();
    initSidebar();
    initNavigation();
    initImageManager();
    initZoomManager();
    initChapterManager();
    initScrubberManager();
    initHomePageUI();
    initViewerState();

    hideSpinner();
}

function start() {
    loadInitialState();
    cacheDOMelements();
    initTheme();
    initShortcuts();

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