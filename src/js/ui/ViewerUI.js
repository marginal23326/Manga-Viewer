import { DOM, showElement, hideElement } from '../core/DOMUtils';

export function showHomepage() {
    console.log("Showing Homepage UI (Placeholder)");
    if (DOM.homepageContainer) showElement(DOM.homepageContainer);
    if (DOM.viewerContainer) hideElement(DOM.viewerContainer);
    // Add logic for sidebar/nav visibility if needed
}

export function showViewer() {
    console.log("Showing Viewer UI (Placeholder)");
    if (DOM.homepageContainer) hideElement(DOM.homepageContainer);
    if (DOM.viewerContainer) showElement(DOM.viewerContainer, 'flex'); // Show viewer container
     // Add logic for sidebar/nav visibility if needed
}