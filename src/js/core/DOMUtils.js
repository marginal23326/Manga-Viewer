export const $ = (selector, parent = document) => parent.querySelector(selector);

export const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

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
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
};

export const setDataAttribute = (element, key, value) => {
    if (element) element.dataset[key] = value;
};

export const getDataAttribute = (element, key) => (element ? element.dataset[key] : undefined);

export const setText = (element, text) => {
    if (element) element.textContent = text;
};

export const setHtml = (element, html) => {
    if (element) element.innerHTML = html;
};

export const getValue = (element) => (element ? element.value : undefined);

export const setValue = (element, value) => {
    if (element) element.value = value;
};

export const isChecked = (element) => (element ? element.checked : false);

export const setChecked = (element, checked) => {
    if (element) element.checked = checked;
};

function appendChildSafe(parent, child) {
    if (Array.isArray(child)) {
        child.forEach((c) => appendChildSafe(parent, c));
    } else if (typeof child === "string" || typeof child === "number") {
        parent.append(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
        parent.append(child);
    }
}

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

    const specialKeys = new Set(["className", "id", "style", "dataset"]);

    for (const [key, value] of Object.entries(props)) {
        if (specialKeys.has(key)) continue;

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

    children.forEach((child) => appendChildSafe(el, child));

    return el;
}

const DOM_SELECTORS = {
    app: "#app",
    sidebarToggleContainer: "#sidebar-toggle-container",
    passwordModal: "#password-modal",
    loadingSpinner: "#loading-spinner",
    sidebar: "#sidebar",
    mainContent: "#main-content",
    homepageContainer: "#homepage-container",
    viewerContainer: "#viewer-container",
    progressBar: "#progress-bar",
    imageContainer: "#image-container",
    navContainer: "#nav-container",
    modalContainer: "#modal-container",
    lightbox: "#lightbox",
    scrubberParent: "#scrubber-parent",
    scrubberIcon: "#scrubber-icon",
    scrubberContainer: "#scrubber-container",
    scrubberPreview: "#scrubber-preview div",
    scrubberTrack: "#scrubber",
    scrubberMarkerActive: "#scrubber-marker-active",
    scrubberMarkerHover: "#scrubber-marker",
    mangaSearchInput: "#manga-search-input",
    addMangaBtn: "#add-manga-btn",
    selectionActionsContainer: "#selection-actions",
    mangaSelectBtn: "#manga-select-btn",
    mangaList: "#manga-list",
};

const domCache = {};
export const DOM = Object.defineProperties(
    {},
    Object.fromEntries(
        Object.entries(DOM_SELECTORS).map(([key, selector]) => [
            key,
            {
                enumerable: true,
                get: () => (domCache[key] ||= $(selector)),
            },
        ]),
    ),
);
