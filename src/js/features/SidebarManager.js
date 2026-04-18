import { createElement } from "lucide";

import { createSelect } from "../components/CustomSelect";
import { registerChapterSelectorUpdater } from "../core/ChapterSelector";
import Config from "../core/Config";
import { DOM, $, setAttribute, addClass, toggleClass, removeClass, h } from "../core/DOMUtils";
import { AppIcons } from "../core/icons";
import { withCurrentManga } from "../core/MangaLibrary";
import { getSettings } from "../core/MangaSettings";
import { PersistState, LightboxState } from "../core/State";
import { updateViewerControlsVisibility } from "../ui/ViewerControls";
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
    const icon = h("i", {
        "data-lucide": iconName,
        width: "24",
        height: "24",
        "stroke-width": "3",
        className: "flex-shrink-0",
    });

    const button = h(
        "button",
        {
            id,
            title: tooltip,
            className: `flex items-center justify-center p-3 bg-paper/60 dark:bg-ink/60 backdrop-blur-md text-black dark:text-white brutal-border brutal-transition cursor-pointer hover:-translate-y-1 hover:-translate-x-1 hover:bg-[#FF3366] hover:!bg-opacity-100 hover:text-white hover:border-[#FF3366] hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none focus:outline-none focus:ring-0 ${additionalClasses}`,
        },
        icon,
    );

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
    const currentModeIndex = modes.indexOf(PersistState.sidebarMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length];
    if (PersistState.update("sidebarMode", nextMode)) {
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
    if (LightboxState.isOpen) return;

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
    const zoomLevelDisplay = h(
        "div",
        {
            id: "zoom-level-display",
            className:
                "text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white bg-[#FF3366] text-white px-2 py-1 brutal-border mb-2 text-center brutal-shadow-sm",
        },
        "ZOOM: 100%",
    );

    const buttonsContainer = h("div", {
        className: "flex flex-row items-center w-full brutal-shadow",
    });

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

    const container = h("div", {
        className: "flex flex-col items-stretch w-full mb-6",
        "data-viewer-only": "true",
    });
    container.appendChild(zoomLevelDisplay);
    container.appendChild(buttonsContainer);
    return container;
}

function createChapterSelectorPlaceholder() {
    const placeholder = h("div", {
        id: "chapter-selector-placeholder",
        className: "w-full mb-6 hidden",
        "data-viewer-only": "true",
    });
    return placeholder;
}

// Brutalist divider - thick black/white block instead of subtle line
const createDivider = (viewerOnly = false) => {
    return h("div", {
        className: "w-full h-1 bg-black dark:bg-white my-6 border-y-2 border-black dark:border-white",
        "data-viewer-only": viewerOnly ? "true" : undefined,
    });
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
        "brutal-shadow-accent",
    );
    homeButton = createIconButton(
        "return-to-home",
        "home",
        "RETURN TO ARCHIVE (Esc)",
        returnToHome,
        "brutal-shadow-accent",
    );
    setAttribute(homeButton, { "data-viewer-only": "true" });

    toggleContainer.innerHTML = ""; // Clear any old static content
    toggleContainer.append(sidebarToggleButton, homeButton);

    sidebarElement.innerHTML = "";

    // CONFIG / SETTINGS Button
    const settingsText = h("span", {}, "SETTINGS");
    const settingsIcon = h("i", { "data-lucide": "settings", width: "20", height: "20", "stroke-width": "3" });
    const settingsButton = h(
        "button",
        {
            id: "settings-button",
            className:
                "w-full flex items-center justify-between p-3 bg-white dark:bg-black text-black dark:text-white brutal-border font-space font-bold uppercase tracking-widest transition-all hover:bg-[#FF3366] hover:text-white hover:border-[#FF3366] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none",
        },
        settingsText,
        settingsIcon,
    );
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
            "!border-2 !border-black dark:!border-white !bg-paper dark:!bg-ink !text-black dark:!text-white hover:!bg-[#FF3366] hover:!text-white brutal-shadow",
    });
    registerChapterSelectorUpdater(syncChapterSelectorOptions);

    // Initial state setup
    applySidebarMode(PersistState.sidebarMode);
    updateViewerControlsVisibility(PersistState.currentView === "viewer");

    if (PersistState.currentView === "viewer") {
        withCurrentManga((currentManga) => {
            const settings = getSettings(currentManga.id);
            syncChapterSelectorOptions(currentManga.totalChapters, settings.currentChapter || 0);
        });
    }
}

function syncChapterSelectorOptions(totalChapters, currentChapter) {
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
