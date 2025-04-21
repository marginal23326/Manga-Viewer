import { createSelect } from "../components/CustomSelect";
import { AppState } from "../core/AppState";
import Config from "../core/Config";
import { DOM, $, $$, setAttribute, addClass, removeClass, toggleClass } from "../core/DOMUtils";
import { returnToHome } from "../ui/ViewerUI";

import { jumpToChapter } from "./ChapterManager";
import { openSettings } from "./SettingsManager";
import { zoomIn, zoomOut, resetZoom } from "./ZoomManager";

let sidebarElement = null;
let sidebarContentElement = null;
let hoverTimeout = null;
let chapterSelectInstance = null;

function setSidebarState(element, stateName, isOpen) {
    if (!element) return;
    if (isOpen) {
        setAttribute(element, { [`data-${stateName}`]: "open" });
    } else {
        element.removeAttribute(`data-${stateName}`);
    }
}

export function toggleSidebarState() {
    if (AppState.lightbox.isOpen || !sidebarElement || !DOM.mainContent) return;
    const currentState = sidebarElement.dataset.state === "open";
    setSidebarState(sidebarElement, "state", !currentState);
    setSidebarState(DOM.mainContent, "sidebar-state", !currentState);

    // If toggling closed, also ensure hover state is removed
    if (!currentState) {
        setSidebarHoverState(false);
    }
}

function setSidebarHoverState(isOpen) {
    if (!sidebarElement || !DOM.mainContent) return;
    // Skip if trying to open when sidebar is already fully open
    if (isOpen && sidebarElement.dataset.state === "open") return;

    setSidebarState(sidebarElement, "hover-state", isOpen);
    setSidebarState(DOM.mainContent, "sidebar-hover-state", isOpen);
}

function createSidebarButton(id, iconName, label, tooltip, clickHandler, viewerOnly = false) {
    const button = document.createElement("button");
    addClass(button, "btn-icon w-full flex items-center justify-start px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",);
    if (id) button.id = id;
    setAttribute(button, { title: tooltip || label }); // Basic tooltip

    // Icon placeholder
    const icon = document.createElement("i");
    setAttribute(icon, { "data-lucide": iconName, "width": "24", "height": "24", "stroke-width": "2" });
    addClass(icon, "flex-shrink-0"); // Prevent icon shrinking

    // Label (always visible when sidebar is open)
    const labelSpan = document.createElement("span");
    addClass(labelSpan, "ml-4 inline whitespace-nowrap"); // Changed from hidden group-hover:inline...
    labelSpan.textContent = label;

    button.appendChild(icon);
    button.appendChild(labelSpan);

    if (clickHandler) {
        button.addEventListener("click", (event) => {
            clickHandler();
            event.currentTarget.blur();
        });
    }

    // Add data attribute to mark viewer-only buttons
    if (viewerOnly) {
        setAttribute(button, { "data-viewer-only": "true" });
    }

    return button;
}

// Function to create the zoom controls group
function createZoomControls() {
    const container = document.createElement("div");
    addClass(container, "flex flex-col items-stretch w-full");
    setAttribute(container, { "data-viewer-only": "true" }); // Hide group on homepage

    // Zoom Level Display (Placeholder)
    const zoomLevelDisplay = document.createElement("div");
    zoomLevelDisplay.id = "zoom-level-display";
    addClass(zoomLevelDisplay, "text-xs text-center text-gray-500 dark:text-gray-400 my-1 block");
    zoomLevelDisplay.textContent = "Zoom: 100%"; // Initial value

    // Zoom Buttons Container
    const buttonsContainer = document.createElement("div");
    // Arrange horizontally and centered
    addClass(buttonsContainer, "flex flex-row items-center justify-center w-full px-2 space-x-2");

    const zoomInBtn = createSidebarButton("zoom-in-button", "zoom-in", "", "Zoom In (+)", zoomIn);
    const zoomOutBtn = createSidebarButton("zoom-out-button", "zoom-out", "", "Zoom Out (-)", zoomOut);
    const zoomResetBtn = createSidebarButton("zoom-reset-button", "undo-2", "", "Reset Zoom (=)", resetZoom);

    // Adjust button styles for icon-only layout
    [zoomInBtn, zoomOutBtn, zoomResetBtn].forEach((btn) => {
        removeClass(btn, "w-full justify-start px-4 flex-1");
        addClass(btn, "justify-center p-2 rounded-md");
        removeClass(btn.querySelector("span"), "ml-4");
    });

    buttonsContainer.appendChild(zoomInBtn);
    buttonsContainer.appendChild(zoomOutBtn);
    buttonsContainer.appendChild(zoomResetBtn);

    container.appendChild(zoomLevelDisplay);
    container.appendChild(buttonsContainer);

    return container;
}
// Function to create a placeholder for the chapter selector
function createChapterSelectorPlaceholder() {
    const placeholder = document.createElement("div");
    placeholder.id = "chapter-selector-placeholder";
    addClass(placeholder, "ml-2 mr-2 my-2 hidden"); // Start hidden
    setAttribute(placeholder, { "data-viewer-only": "true" }); // Hide on homepage
    return placeholder;
}

// Update visibility of viewer-only controls
export function updateSidebarViewerControls(showViewerControls) {
    if (!sidebarElement) {
        console.warn("updateSidebarViewerControls called before sidebarElement is ready.");
        return;
    }
    const viewerOnlyElements = $$('[data-viewer-only="true"]', sidebarElement);
    viewerOnlyElements?.forEach((el) => {
        toggleClass(el, "hidden", !showViewerControls);
    });
    // Also toggle the custom select wrapper if it exists
    chapterSelectInstance?.element?.parentElement?.classList.toggle("hidden", !showViewerControls);
}

const createDivider = (viewerOnly = false) => {
    const divider = document.createElement("hr");
    addClass(divider, "w-full border-gray-200 dark:border-gray-600 my-2");
    if (viewerOnly) setAttribute(divider, { "data-viewer-only": "true" });
    return divider;
};

export function initSidebar() {
    sidebarElement = DOM.sidebar;
    if (!sidebarElement) {
        console.error("Sidebar element (#sidebar) not found!");
        return;
    }

    sidebarElement.innerHTML = ""; // Clear existing content
    sidebarContentElement = document.createElement("div");
    addClass(sidebarContentElement, "flex flex-col items-stretch w-full space-y-2 flex-grow");

    // Build sidebar content
    const chapterSelectorPlaceholder = createChapterSelectorPlaceholder(); // Create placeholder
    const elements = [
        createSidebarButton("return-to-home", "home", "Home", "Return to Home (Esc)", returnToHome, true),
        createDivider(true),
        createZoomControls(),
        chapterSelectorPlaceholder, // Add placeholder to elements array
        createDivider(),
        createSidebarButton("settings-button", "settings", "Settings", "Open Settings (Shift+S)", openSettings),
    ];

    sidebarContentElement.append(...elements.slice(0, -1));
    sidebarElement.append(sidebarContentElement, elements[elements.length - 1]);

    chapterSelectInstance = createSelect({
        container: chapterSelectorPlaceholder,
        items: [{ value: "", text: "N/A" }],
        placeholder: "Chapter",
        width: "w-full",
        appendTo: true,
        onChange: (value) => {
            jumpToChapter(value);
        },
    });
    chapterSelectInstance.element.parentElement.dataset.viewerOnly = "true";

    // Initialize states and events
    updateSidebarViewerControls(AppState.currentView === "viewer");
    initSidebarInteraction();
}

// Function to update the zoom level display (called by ZoomManager)
export function updateZoomLevelDisplay(zoomLevel) {
    if (!sidebarElement) return;
    const display = $("#zoom-level-display", sidebarElement);
    if (display) {
        display.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
    }
}

// Function to update the chapter selector options (called by ChapterManager)
export function updateChapterSelectorOptions(totalChapters, currentChapter) {
    if (!chapterSelectInstance) {
        // Retry if instance not ready yet (might happen on initial load)
        setTimeout(() => updateChapterSelectorOptions(totalChapters, currentChapter), 100);
        return;
    }

    const options = [];
    if (totalChapters > 0) {
        for (let i = 0; i < totalChapters; i++) {
            options.push({ value: i, text: `Chapter ${i + 1}` });
        }
        chapterSelectInstance.setOptions(options, currentChapter);
        toggleClass(chapterSelectInstance.element, "opacity-50 pointer-events-none", false);
    } else {
        options.push({ value: "", text: "N/A" });
        chapterSelectInstance.setOptions(options, "");
        toggleClass(chapterSelectInstance.element, "opacity-50 pointer-events-none", true);
    }
}

function initSidebarInteraction() {
    if (!sidebarElement) return;

    const handleMousePosition = (event) => {
        const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY;
        const isOverSidebar = sidebarElement.contains(event.target);

        clearTimeout(hoverTimeout);

        if (isNearEdge && !isOverSidebar && !AppState.lightbox.isOpen) {
            hoverTimeout = setTimeout(() => setSidebarHoverState(true), Config.SIDEBAR_HOVER_DELAY);
        } else if (!isNearEdge && !isOverSidebar) {
            setSidebarHoverState(false);
        }
    };

    document.addEventListener("mousemove", handleMousePosition);
    sidebarElement.addEventListener("mouseleave", () => {
        clearTimeout(hoverTimeout);
        setSidebarHoverState(false);
    });
}
