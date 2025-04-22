import { createElement } from "lucide";

import { createSelect } from "../components/CustomSelect";
import { AppState } from "../core/AppState";
import Config from "../core/Config";
import { DOM, $, $$, setAttribute, addClass, toggleClass, setDataAttribute } from "../core/DOMUtils";
import { AppIcons } from "../core/icons";
import { returnToHome } from "../ui/ViewerUI";

import { jumpToChapter } from "./ChapterManager";
import { openSettings } from "./SettingsManager";
import { zoomIn, zoomOut, resetZoom } from "./ZoomManager";

let sidebarElement = null;
let sidebarToggleButton = null;
let homeButton = null;
let chapterSelectInstance = null;
let hoverTimeout = null;
let mouseMoveListener = null;

function createIconButton(id, iconName, tooltip, clickHandler) {
    const button = document.createElement("button");
    addClass(button, "btn-icon flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-md");
    if (id) button.id = id;
    setAttribute(button, { title: tooltip });
    const icon = document.createElement("i");
    setAttribute(icon, { "data-lucide": iconName, "width": "24", "height": "24", "stroke-width": "2" });
    addClass(icon, "flex-shrink-0");
    button.appendChild(icon);
    if (clickHandler) {
        button.addEventListener("click", (event) => {
            clickHandler();
            event.currentTarget.blur();
        });
    }
    return button;
}

export function cycleSidebarMode() {
    const modes = ["hover", "open", "closed"];
    const currentModeIndex = modes.indexOf(AppState.sidebarMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    if (AppState.update("sidebarMode", nextMode)) {
        applySidebarMode(nextMode);
    }
}

function applySidebarMode(mode) {
    if (!sidebarElement || !DOM.mainContent || !sidebarToggleButton || !DOM.progressBar) return;

    if (mouseMoveListener) {
        document.removeEventListener("mousemove", mouseMoveListener);
        mouseMoveListener = null;
    }
    clearTimeout(hoverTimeout);
    hoverTimeout = null;

    setAttribute(sidebarToggleButton, { title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} (Ctrl+B)` });

    const iconMap = { open: AppIcons.PanelLeftOpen, closed: AppIcons.PanelLeftClose };
    const currentIconData = iconMap[mode] || AppIcons.PanelLeft;

    sidebarToggleButton.innerHTML = "";
    sidebarToggleButton.appendChild(createElement(currentIconData));

    const isOpen = mode === "open";
    const useHover = mode === "hover";

    setSidebarVisualState(isOpen || (useHover && !sidebarElement.classList.contains('w-0')));

    if (useHover) {
        mouseMoveListener = handleMousePosition;
        document.addEventListener("mousemove", mouseMoveListener);
    }
}

function setSidebarVisualState(isOpen) {
    if (!sidebarElement || !DOM.mainContent || !DOM.progressBar) return;
    toggleClass(sidebarElement, "overflow-y-auto w-48 pt-14", isOpen);
    toggleClass(DOM.mainContent, "ml-48", isOpen);
    toggleClass(sidebarElement, "overflow-hidden w-0", !isOpen);
    toggleClass(DOM.mainContent, "ml-0", !isOpen);
    setDataAttribute(DOM.progressBar, "sidebarOpen", isOpen ? "true" : "false");
}

const handleMousePosition = (event) => {
    if (AppState.lightbox.isOpen) return;

    const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY;
    const toggleContainer = DOM.sidebarToggleContainer;
    const isOverInteractiveArea = sidebarElement.contains(event.target) || (toggleContainer && toggleContainer.contains(event.target));

    clearTimeout(hoverTimeout);
    hoverTimeout = null;

    if (isNearEdge && !isOverInteractiveArea && sidebarElement.classList.contains('w-0')) {
        hoverTimeout = setTimeout(() => {
            setSidebarVisualState(true);
            hoverTimeout = null;
        }, Config.SIDEBAR_HOVER_DELAY);
    } else if (!isNearEdge && !isOverInteractiveArea) {
        if (!chapterSelectInstance?.isOpen()) {
            setSidebarVisualState(false);
        }
    }
};


function createZoomControls() {
    const container = document.createElement("div");
    addClass(container, "flex flex-col items-stretch w-full px-2");
    setAttribute(container, { "data-viewer-only": "true" });
    const zoomLevelDisplay = document.createElement("div");
    zoomLevelDisplay.id = "zoom-level-display";
    addClass(zoomLevelDisplay, "text-xs text-center text-gray-500 dark:text-gray-400 my-1");
    zoomLevelDisplay.textContent = "Zoom: 100%";
    const buttonsContainer = document.createElement("div");
    addClass(buttonsContainer, "flex flex-row items-center justify-center w-full space-x-2");
    const zoomInBtn = createIconButton("zoom-in-button", "zoom-in", "Zoom In (+)", zoomIn);
    const zoomOutBtn = createIconButton("zoom-out-button", "zoom-out", "Zoom Out (-)", zoomOut);
    const zoomResetBtn = createIconButton("zoom-reset-button", "undo-2", "Reset Zoom (=)", resetZoom);

    [zoomInBtn, zoomOutBtn, zoomResetBtn].forEach(btn => {
        addClass(btn, "border border-gray-300 dark:border-gray-700");
    });

    buttonsContainer.append(zoomInBtn, zoomOutBtn, zoomResetBtn);
    container.append(zoomLevelDisplay, buttonsContainer);
    return container;
}

function createChapterSelectorPlaceholder() {
    const placeholder = document.createElement("div");
    placeholder.id = "chapter-selector-placeholder";
    addClass(placeholder, "w-full px-2 my-2 hidden");
    setAttribute(placeholder, { "data-viewer-only": "true" });
    return placeholder;
}

const createDivider = (viewerOnly = false) => {
    const divider = document.createElement("hr");
    addClass(divider, "border-gray-200 dark:border-gray-600 my-2 mx-2");
    if (viewerOnly) setAttribute(divider, { "data-viewer-only": "true" });
    return divider;
};

export function initSidebar() {
    sidebarElement = DOM.sidebar;
    const toggleContainer = DOM.sidebarToggleContainer;
    addClass(toggleContainer, "flex flex-row space-x-1");

    sidebarToggleButton = createIconButton("sidebar-toggle-button", "panel-left", "", cycleSidebarMode);
    addClass(sidebarToggleButton, "bg-white/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 backdrop-blur-sm shadow");

    homeButton = createIconButton("return-to-home", "home", "Return to Home (Esc)", returnToHome);
    addClass(homeButton, "bg-white/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 backdrop-blur-sm shadow");
    setAttribute(homeButton, { "data-viewer-only": "true" });

    toggleContainer.append(sidebarToggleButton, homeButton);

    sidebarElement.innerHTML = "";

    const settingsButton = createIconButton("settings-button", "settings", "Open Settings (Shift+S)", openSettings);
    addClass(settingsButton, "mx-2 px-16 border border-gray-300 dark:border-gray-700");

    const chapterSelectorPlaceholder = createChapterSelectorPlaceholder();

    sidebarElement.append(createDivider(true), createZoomControls(), chapterSelectorPlaceholder, createDivider(), settingsButton);
    addClass(sidebarElement, "space-y-2");

    chapterSelectInstance = createSelect({
        container: chapterSelectorPlaceholder,
        items: [{ value: "", text: "N/A" }],
        placeholder: "Chapter",
        width: "w-full",
        appendTo: true,
        onChange: jumpToChapter,
    });
    setAttribute(chapterSelectorPlaceholder, { "data-viewer-only": "true" });

    // Initial state setup
    toggleClass(sidebarElement, "overflow-hidden", AppState.sidebarMode !== 'open');
    toggleClass(sidebarElement, "overflow-y-auto", AppState.sidebarMode === 'open');
    applySidebarMode(AppState.sidebarMode);
    updateSidebarViewerControls(AppState.currentView === 'viewer');
}

export function updateSidebarViewerControls(showViewerControls) {
    if (homeButton) toggleClass(homeButton, "hidden", !showViewerControls);
    if (!sidebarElement) return;
    $$('[data-viewer-only="true"]', sidebarElement)?.forEach((el) => {
        toggleClass(el, "hidden", !showViewerControls);
    });
}

export function updateZoomLevelDisplay(zoomLevel) {
    const display = $("#zoom-level-display", sidebarElement);
    if (display) {
        display.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
    }
}

export function updateChapterSelectorOptions(totalChapters, currentChapter) {
    if (!chapterSelectInstance) {
        return;
    }
    const placeholder = $("#chapter-selector-placeholder", sidebarElement);
    const hasChapters = totalChapters > 0;
    const options = hasChapters
        ? Array.from({ length: totalChapters }, (_, i) => ({ value: i, text: `Chapter ${i + 1}` }))
        : [{ value: "", text: "N/A" }];

    chapterSelectInstance.setOptions(options, hasChapters ? currentChapter : "");
    if (placeholder) toggleClass(placeholder, "opacity-50 pointer-events-none", !hasChapters);
}
