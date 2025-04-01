import { AppState } from '../core/AppState'; // Import AppState
import { DOM, showElement, hideElement, addClass, removeClass } from '../core/DOMUtils';
import { updateSidebarViewerControls } from '../features/SidebarManager'; // Import to update sidebar controls

export function showHomepage() {
    if (DOM.homepageContainer) showElement(DOM.homepageContainer);
    if (DOM.viewerContainer) hideElement(DOM.viewerContainer);
    updateSidebarViewerControls(false); // Hide viewer controls
    // Ensure nav is hidden
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
    updateSidebarViewerControls(true); // Show viewer controls
}

// Function called by Home button or Esc key
export function returnToHome() {
    // TODO: Save scroll position if currently viewing
    // import { saveCurrentScrollPosition } from '../features/ImageManager';
    // if (AppState.currentView === 'viewer') { saveCurrentScrollPosition(); }

    AppState.update('currentManga', null, false); // Clear current manga
    AppState.update('currentView', 'homepage'); // Switch view (triggers showHomepage)
}

// Function called by Fullscreen button or 'f' key
export function toggleFullScreen() {
    console.log('Placeholder: Toggle Fullscreen');
    // TODO: Implement actual fullscreen logic using document.fullscreenElement etc.
    // Remember to call updateFullscreenIcon(document.fullscreenElement != null) from NavigationManager
}