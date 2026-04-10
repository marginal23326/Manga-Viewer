import { createElement } from "lucide";

import { createSelect } from "../components/CustomSelect";
import Config from "../core/Config";
import { DOM, $, $$, setAttribute, addClass, toggleClass, removeClass } from "../core/DOMUtils";
import { AppIcons } from "../core/icons";
import { State } from "../core/State";
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

// Brutalist button factory
function createIconButton(id, iconName, tooltip, clickHandler, additionalClasses = "") {
    const button = document.createElement("button");
    addClass(
        button,
        `flex items-center justify-center p-3 bg-[#f4f4f0]/60 dark:bg-[#0a0a0a]/60 backdrop-blur-md text-black dark:text-white border-2 border-black dark:border-white transition-all duration-150 ease-out cursor-pointer hover:-translate-y-1 hover:-translate-x-1 hover:bg-[#FF3366] hover:!bg-opacity-100 hover:text-white hover:border-[#FF3366] hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none focus:outline-none focus:ring-0 ${additionalClasses}`,
    );
    if (id) button.id = id;
    setAttribute(button, { title: tooltip });

    const icon = document.createElement("i");
    setAttribute(icon, { "data-lucide": iconName, width: "24", height: "24", "stroke-width": "3" });
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
    const currentModeIndex = modes.indexOf(State.sidebarMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    if (State.update("sidebarMode", nextMode)) {
        applySidebarMode(nextMode);
    }
}

function applySidebarMode(mode) {
    if (!sidebarElement || !DOM.mainContent || !sidebarToggleButton) return;

    if (mouseMoveListener) {
        document.removeEventListener("mousemove", mouseMoveListener);
        mouseMoveListener = null;
    }
    clearTimeout(hoverTimeout);
    hoverTimeout = null;

    setAttribute(sidebarToggleButton, { title: `${mode.toUpperCase()} MODE (Ctrl+B)` });

    const iconMap = { open: AppIcons.PanelLeftOpen, closed: AppIcons.PanelLeftClose };
    const currentIconData = iconMap[mode] || AppIcons.PanelLeft;

    sidebarToggleButton.innerHTML = "";
    // Thicker stroke for brutalist toggle icon
    sidebarToggleButton.appendChild(createElement(currentIconData, { "stroke-width": "3", width: "24", height: "24" }));

    const isOpen = mode === "open";
    const useHover = mode === "hover";

    setSidebarVisualState(isOpen || (useHover && !sidebarElement.classList.contains("w-0")));

    if (useHover) {
        mouseMoveListener = handleMousePosition;
        document.addEventListener("mousemove", mouseMoveListener);
    }
}

function setSidebarVisualState(isOpen) {
    if (!sidebarElement || !DOM.mainContent) return;

    if (isOpen) {
        removeClass(sidebarElement, "w-0");
        addClass(sidebarElement, "w-64 pt-20 px-4 bg-[#f4f4f0]/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl");
        addClass(sidebarElement, "shadow-[12px_0_0_0_#000] dark:shadow-[12px_0_0_0_#FF3366]");
    } else {
        removeClass(sidebarElement, "w-64 pt-20 px-4 shadow-[12px_0_0_0_#000] dark:shadow-[12px_0_0_0_#FF3366]");
        addClass(sidebarElement, "w-0 overflow-hidden");
    }
}

const handleMousePosition = (event) => {
    if (State.lightbox.isOpen) return;

    const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY;
    const toggleContainer = DOM.sidebarToggleContainer;
    const isOverInteractiveArea =
        sidebarElement.contains(event.target) || (toggleContainer && toggleContainer.contains(event.target));

    clearTimeout(hoverTimeout);
    hoverTimeout = null;

    if (isNearEdge && !isOverInteractiveArea && sidebarElement.classList.contains("w-0")) {
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
    addClass(container, "flex flex-col items-stretch w-full mb-6");
    setAttribute(container, { "data-viewer-only": "true" });

    // Brutalist Label
    const zoomLevelDisplay = document.createElement("div");
    zoomLevelDisplay.id = "zoom-level-display";
    addClass(
        zoomLevelDisplay,
        "text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white bg-[#FF3366] text-white px-2 py-1 border-2 border-black dark:border-white mb-2 text-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] dark:shadow-[2px_2px_0_0_rgba(255,255,255,1)]",
    );
    zoomLevelDisplay.textContent = "ZOOM: 100%";

    // Grouped buttons (segmented control style)
    const buttonsContainer = document.createElement("div");
    addClass(
        buttonsContainer,
        "flex flex-row items-center w-full shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
    );

    const zoomOutBtn = createIconButton(
        "zoom-out-button",
        "zoom-out",
        "ZOOM OUT (-)",
        zoomOut,
        "flex-1 !shadow-none border-r-0",
    );
    const zoomResetBtn = createIconButton(
        "zoom-reset-button",
        "undo-2",
        "RESET (=)",
        resetZoom,
        "flex-1 !shadow-none border-r-0",
    );
    const zoomInBtn = createIconButton("zoom-in-button", "zoom-in", "ZOOM IN (+)", zoomIn, "flex-1 !shadow-none");

    buttonsContainer.append(zoomOutBtn, zoomResetBtn, zoomInBtn);
    container.append(zoomLevelDisplay, buttonsContainer);
    return container;
}

function createChapterSelectorPlaceholder() {
    const placeholder = document.createElement("div");
    placeholder.id = "chapter-selector-placeholder";
    addClass(placeholder, "w-full mb-6 hidden");
    setAttribute(placeholder, { "data-viewer-only": "true" });
    return placeholder;
}

// Brutalist divider - thick black/white block instead of subtle line
const createDivider = (viewerOnly = false) => {
    const divider = document.createElement("div");
    addClass(divider, "w-full h-1 bg-black dark:bg-white my-6 border-y-2 border-black dark:border-white");
    if (viewerOnly) setAttribute(divider, { "data-viewer-only": "true" });
    return divider;
};

export function initSidebar() {
    sidebarElement = $("#sidebar");
    if (!sidebarElement) return;
    addClass(sidebarElement, "bg-opacity-90 dark:bg-opacity-90 backdrop-blur-xl");
    const toggleContainer = DOM.sidebarToggleContainer;
    // Ensure the container is visible and styled correctly
    removeClass(toggleContainer, "mix-blend-difference text-white");
    addClass(toggleContainer, "flex flex-row space-x-2");

    sidebarToggleButton = createIconButton(
        "sidebar-toggle-button",
        "panel-left",
        "TOGGLE PANEL",
        cycleSidebarMode,
        "shadow-[4px_4px_0_0_#FF3366]",
    );
    homeButton = createIconButton(
        "return-to-home",
        "home",
        "RETURN TO ARCHIVE (Esc)",
        returnToHome,
        "shadow-[4px_4px_0_0_#FF3366]",
    );
    setAttribute(homeButton, { "data-viewer-only": "true" });

    toggleContainer.innerHTML = ""; // Clear any old static content
    toggleContainer.append(sidebarToggleButton, homeButton);

    sidebarElement.innerHTML = "";

    // CONFIG / SETTINGS Button
    const settingsButton = document.createElement("button");
    addClass(
        settingsButton,
        "w-full flex items-center justify-between p-3 bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white font-space font-bold uppercase tracking-widest transition-all hover:bg-[#FF3366] hover:text-white hover:border-[#FF3366] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none",
    );
    settingsButton.id = "settings-button";

    const settingsText = document.createElement("span");
    settingsText.textContent = "SETTINGS";

    const settingsIcon = document.createElement("i");
    setAttribute(settingsIcon, { "data-lucide": "settings", width: "20", height: "20", "stroke-width": "3" });

    settingsButton.append(settingsText, settingsIcon);
    settingsButton.addEventListener("click", openSettings);

    const chapterSelectorPlaceholder = createChapterSelectorPlaceholder();

    sidebarElement.append(
        createDivider(true),
        createZoomControls(),
        chapterSelectorPlaceholder,
        createDivider(),
        settingsButton,
    );

    addClass(sidebarElement, "flex flex-col items-center justify-start");

    // Re-init the custom select inside the sidebar
    chapterSelectInstance = createSelect({
        container: chapterSelectorPlaceholder,
        items: [{ value: "", text: "NO DATA" }],
        placeholder: "SELECT CH.",
        width: "w-full",
        appendTo: true,
        onChange: jumpToChapter,
        searchable: true,
        scroll: true,
        buttonClass:
            "!border-2 !border-black dark:!border-white !bg-[#f4f4f0] dark:!bg-[#0a0a0a] !text-black dark:!text-white hover:!bg-[#FF3366] hover:!text-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
    });

    // Initial state setup
    applySidebarMode(State.sidebarMode);
    updateSidebarViewerControls(State.currentView === "viewer");
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
        // Pad to ensure it looks like a digital readout
        display.textContent = `ZOOM: ${Math.round(zoomLevel * 100)
            .toString()
            .padStart(3, "0")}%`;
    }
}

export function updateChapterSelectorOptions(totalChapters, currentChapter) {
    if (!chapterSelectInstance) {
        return;
    }
    const placeholder = $("#chapter-selector-placeholder", sidebarElement);
    const hasChapters = totalChapters > 0;

    // Formatting chapter text like archival logs
    const options = hasChapters
        ? Array.from({ length: totalChapters }, (_, i) => ({
              value: i,
              text: `CH. ${(i + 1).toString().padStart(3, "0")}`,
          }))
        : [{ value: "", text: "NO DATA" }];

    chapterSelectInstance.setOptions(options, hasChapters ? currentChapter : "");
    if (placeholder) toggleClass(placeholder, "opacity-50 pointer-events-none grayscale", !hasChapters);
}
