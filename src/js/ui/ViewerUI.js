import { DOM, showElement, hideElement, removeClass, addClass } from '../core/DOMUtils'; // Import addClass/removeClass

export function showHomepage() {
    console.log(" -> showHomepage: Called"); // Log
    const container = DOM.homepageContainer;
    if (container) {
        console.log(" -> showHomepage: Showing homepage container", container); // Log
        // showElement(container); // Using showElement helper
        removeClass(container, 'hidden'); // Explicitly remove 'hidden'
    } else {
        console.error(" -> showHomepage: Homepage container not found!"); // Error Log
    }

    // Hide viewer container
    const viewerContainer = DOM.viewerContainer;
    if (viewerContainer) {
         console.log(" -> showHomepage: Hiding viewer container", viewerContainer); // Log
         // hideElement(viewerContainer); // Using hideElement helper
         addClass(viewerContainer, 'hidden'); // Explicitly add 'hidden'
    }

    // Add logic for sidebar/nav visibility if needed for homepage
    // e.g., maybe hide sidebar controls specific to viewer
}

export function showViewer() {
    console.log(" -> showViewer: Called"); // Log
    const container = DOM.viewerContainer;
    if (container) {
        console.log(" -> showViewer: Showing viewer container", container); // Log
        // showElement(container, 'flex'); // Show viewer container using flex
        removeClass(container, 'hidden'); // Explicitly remove 'hidden'
        addClass(container, 'flex'); // Ensure it's flex if that's the intended display
    } else {
        console.error(" -> showViewer: Viewer container not found!"); // Error Log
    }

    // Hide homepage container
    const homepageContainer = DOM.homepageContainer;
    if (homepageContainer) {
        console.log(" -> showViewer: Hiding homepage container", homepageContainer); // Log
        // hideElement(homepageContainer); // Using hideElement helper
        addClass(homepageContainer, 'hidden'); // Explicitly add 'hidden'
    }

    // Add logic for sidebar/nav visibility for viewer
}

// Optional: Add an init function if ViewerUI needs setup
// export function initViewerUI() {
//    console.log("Viewer UI Initialized (Placeholder)");
// }