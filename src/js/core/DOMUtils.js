export const $ = (selector, parent = document) => parent.querySelector(selector);

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

export function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);

    if (props.className) addClass(el, props.className);
    if (props.id) el.id = props.id;
    if (props.style && typeof props.style === "object") {
        Object.assign(el.style, props.style);
    }
    if (props.dataset && typeof props.dataset === "object") {
        Object.assign(el.dataset, props.dataset);
    }

    const specialKeys = ["className", "id", "style", "dataset"];

    for (const [key, value] of Object.entries(props)) {
        if (specialKeys.includes(key)) continue;

        if (key.startsWith("on") && typeof value === "function") {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === "htmlFor") {
            el.setAttribute("for", value);
        } else if (typeof value === "boolean") {
            el[key] = value;
        } else if (value !== null && value !== undefined) {
            el.setAttribute(key, value);
        }
    }

    const appendChildSafe = (parent, child) => {
        if (Array.isArray(child)) {
            child.forEach((c) => appendChildSafe(parent, c));
        } else if (typeof child === "string" || typeof child === "number") {
            parent.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            parent.appendChild(child);
        }
    };

    children.forEach((child) => appendChildSafe(el, child));

    return el;
}

// Store references to key elements - lazy evaluation with caching
export const DOM = {
    get app() {
        return this._app || (this._app = $("#app"));
    },
    get sidebarToggleContainer() {
        return this._sidebarToggleContainer || (this._sidebarToggleContainer = $("#sidebar-toggle-container"));
    },
    get passwordModal() {
        return this._passwordModal || (this._passwordModal = $("#password-modal"));
    },
    get loadingSpinner() {
        return this._loadingSpinner || (this._loadingSpinner = $("#loading-spinner"));
    },
    get sidebar() {
        return this._sidebar || (this._sidebar = $("#sidebar"));
    },
    get mainContent() {
        return this._mainContent || (this._mainContent = $("#main-content"));
    },
    get homepageContainer() {
        return this._homepageContainer || (this._homepageContainer = $("#homepage-container"));
    },
    get viewerContainer() {
        return this._viewerContainer || (this._viewerContainer = $("#viewer-container"));
    },
    get progressBar() {
        return this._progressBar || (this._progressBar = $("#progress-bar"));
    },
    get imageContainer() {
        return this._imageContainer || (this._imageContainer = $("#image-container"));
    },
    get navContainer() {
        return this._navContainer || (this._navContainer = $("#nav-container"));
    },
    get modalContainer() {
        return this._modalContainer || (this._modalContainer = $("#modal-container"));
    },
    get lightbox() {
        return this._lightbox || (this._lightbox = $("#lightbox"));
    },
    get scrubberParent() {
        return this._scrubberParent || (this._scrubberParent = $("#scrubber-parent"));
    },
    get scrubberIcon() {
        return this._scrubberIcon || (this._scrubberIcon = $("#scrubber-icon"));
    },
    get scrubberContainer() {
        return this._scrubberContainer || (this._scrubberContainer = $("#scrubber-container"));
    },
    get scrubberPreview() {
        return this._scrubberPreview || (this._scrubberPreview = $("#scrubber-preview div"));
    },
    get scrubberTrack() {
        return this._scrubberTrack || (this._scrubberTrack = $("#scrubber"));
    },
    get scrubberMarkerActive() {
        return this._scrubberMarkerActive || (this._scrubberMarkerActive = $("#scrubber-marker-active"));
    },
    get scrubberMarkerHover() {
        return this._scrubberMarkerHover || (this._scrubberMarkerHover = $("#scrubber-marker"));
    },
};
