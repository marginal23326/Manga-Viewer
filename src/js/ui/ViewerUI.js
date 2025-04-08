import { AppState } from '../core/AppState';
import { DOM, showElement, hideElement, addClass, removeClass } from '../core/DOMUtils';
import { updateSidebarViewerControls } from '../features/SidebarManager';
import { updateFullscreenIcon } from '../features/NavigationManager';
import { saveCurrentScrollPosition } from '../features/ImageManager';

export function showHomepage() {
    if (DOM.homepageContainer) showElement(DOM.homepageContainer);
    if (DOM.viewerContainer) hideElement(DOM.viewerContainer);
    updateSidebarViewerControls(false);
    const nav = DOM.navContainer;
    if (nav) {
         removeClass(nav, 'opacity-100 translate-y-0');
         addClass(nav, 'opacity-0 -translate-y-full');
         AppState.update('isNavVisible', false, false);
    }
}

export function showViewer() {
    if (DOM.homepageContainer) hideElement(DOM.homepageContainer);
    if (DOM.viewerContainer) showElement(DOM.viewerContainer, 'flex');
    updateSidebarViewerControls(true);
}

export function returnToHome() {
    saveCurrentScrollPosition();
    AppState.update('currentManga', null, true);
    AppState.update('currentView', 'homepage');
}

export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function handleFullscreenChange() {
    const isFullscreen = !!document.fullscreenElement;
    updateFullscreenIcon(isFullscreen);
}

// Initialize ViewerUI specific listeners
export function initViewerUI() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    // Add other viewer-specific initializations if needed
}