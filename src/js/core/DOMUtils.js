// Simple cache for frequently accessed elements
// const elementCache = {};

export const $ = (selector, parent = document) => {
    // Basic caching, could be more sophisticated
    // if (!elementCache[selector]) {
    const element = parent.querySelector(selector);
    // if (!element) {
    //     console.warn(`DOM element not found for selector: ${selector}`);
    // }
    // elementCache[selector] = element; // Cache only if found? Re-evaluate caching strategy if needed.
    // }
    // return elementCache[selector];
    return element; // Return directly for now, caching might be premature
};

export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

export const showElement = (element, displayType = "block") => {
    if (element) {
        element.classList.remove("hidden");
        element.style.display = displayType;
    }
};

export const hideElement = (element) => {
    if (element) {
        element.classList.add("hidden");
        element.style.display = "none";
    }
};

export const addClass = (element, classNames) => {
    if (element && classNames) {
        element.classList.add(...classNames.split(" ").filter(Boolean));
    }
};

export const removeClass = (element, classNames) => {
    if (element && classNames) {
        element.classList.remove(...classNames.split(" ").filter(Boolean));
    }
};

export const toggleClass = (element, classNames, force) => {
    if (element && classNames) {
        classNames
            .split(" ")
            .filter(Boolean)
            .forEach((className) => {
                element.classList.toggle(className, force);
            });
    }
};

export const setAttribute = (element, attributes) => {
    if (!element) return;
    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
};

export const setDataAttribute = (element, key, value) => {
    if (element) element.dataset[key] = value;
};

export const getDataAttribute = (element, key) => {
    return element ? element.dataset[key] : undefined;
};

export const setText = (element, text) => {
    if (element) element.textContent = text;
};

export const setHtml = (element, html) => {
    if (element) element.innerHTML = html;
};

export const getValue = (element) => {
    return element ? element.value : undefined;
};

export const setValue = (element, value) => {
    if (element) element.value = value;
};

export const isChecked = (element) => {
    return element ? element.checked : false;
};

export const setChecked = (element, checked) => {
    if (element) element.checked = checked;
};

// Store references to key elements after DOM is ready
export let DOM = {};

export function cacheDOMelements() {
    DOM = {
        app: $("#app"),
        sidebarToggleContainer: $("#sidebar-toggle-container"),
        passwordModal: $("#password-modal"),
        loadingSpinner: $("#loading-spinner"),
        sidebar: $("#sidebar"),
        mainContent: $("#main-content"),
        homepageContainer: $("#homepage-container"),
        viewerContainer: $("#viewer-container"),
        progressBar: $("#progress-bar"),
        imageContainer: $("#image-container"),
        navContainer: $("#nav-container"),
        modalContainer: $("#modal-container"),
        lightbox: $("#lightbox"),
        scrubberParent: $("#scrubber-parent"),
        scrubberIcon: $("#scrubber-icon"),
        scrubberContainer: $("#scrubber-container"),
        scrubberPreview: $("#scrubber-preview div"),
        scrubberTrack: $("#scrubber"),
        scrubberMarkerActive: $("#scrubber-marker-active"),
        scrubberMarkerHover: $("#scrubber-marker"),
        // --- Add more specific elements as needed by different modules ---
    }; 
}
