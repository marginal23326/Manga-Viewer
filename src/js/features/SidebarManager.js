import { $, DOM, addClass, h, removeClass, setAttribute, toggleClass } from "../core/DOMUtils";
import { LightboxState, PersistState } from "../state/State";
import { resetZoom, zoomIn, zoomOut } from "./ZoomManager";
import { AppEvents } from "../core/AppEvents";
import { AppIcons } from "../core/icons";
import Config from "../core/Config";
import { createElement } from "lucide";
import { createSelect } from "../components/CustomSelect";
import { getSettings } from "../state/MangaSettings";
import { openSettings } from "./SettingsManager";
import { resetScrollAndLoadChapter } from "./ImageManager";
import { returnToHome } from "../ui/ViewerUI";
import { updateViewerControlsVisibility } from "../ui/ViewerControls";
import { withCurrentManga } from "../state/MangaLibrary";

let sidebarElement = null;
let sidebarToggleButton = null;
let homeButton = null;
let chapterSelectInstance = null;
let hoverTimeout = null;
let mouseMoveListener = null;

function jumpToChapter(selectedValue) {
    return withCurrentManga((manga) => {
        if (selectedValue !== "" && selectedValue >= 0 && selectedValue < manga.totalChapters) {
            resetScrollAndLoadChapter(selectedValue);
        } else if (selectedValue !== "") {
            console.warn("Invalid chapter selected:", selectedValue);
        }
    });
}

// Brutalist button factory
function createIconButton(id, iconName, tooltip, clickHandler, additionalClasses = "") {
    const icon = h("i", {
        className: "flex-shrink-0",
        "data-lucide": iconName,
        height: "24",
        "stroke-width": "3",
        width: "24",
    });

    const button = h(
        "button",
        {
            className: `flex items-center justify-center p-3 bg-paper/60 dark:bg-ink/60 backdrop-blur-md text-black dark:text-white brutal-border brutal-transition cursor-pointer hover:-translate-y-1 hover:-translate-x-1 hover:bg-[#FF3366] hover:!bg-opacity-100 hover:text-white hover:border-[#FF3366] hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none focus:outline-none focus:ring-0 ${additionalClasses}`,
            id,
            title: tooltip,
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

    const iconMap = { closed: AppIcons.PanelLeftClose, open: AppIcons.PanelLeftOpen };
    const currentIconData = iconMap[mode] || AppIcons.PanelLeft;

    sidebarToggleButton.innerHTML = "";
    // Thicker stroke for brutalist toggle icon
    sidebarToggleButton.append(createElement(currentIconData, { height: "24", "stroke-width": "3", width: "24" }));

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

    const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY_PX;
    const toggleContainer = DOM.sidebarToggleContainer;
    const isOverInteractiveArea =
        sidebarElement.contains(event.target) || (toggleContainer && toggleContainer.contains(event.target));

    clearTimeout(hoverTimeout);
    hoverTimeout = null;

    if (isNearEdge && !isOverInteractiveArea && sidebarElement.classList.contains("w-0")) {
        hoverTimeout = setTimeout(() => {
            setSidebarVisualState(true);
            hoverTimeout = null;
        }, Config.SIDEBAR_HOVER_DELAY_MS);
    } else if (!isNearEdge && !isOverInteractiveArea && !chapterSelectInstance?.isOpen()) {
        setSidebarVisualState(false);
    }
};

function createZoomControls() {
    const zoomLevelDisplay = h(
        "div",
        {
            className:
                "text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white bg-[#FF3366] text-white px-2 py-1 brutal-border mb-2 text-center brutal-shadow-sm",
            id: "zoom-level-display",
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
    container.append(zoomLevelDisplay);
    container.append(buttonsContainer);
    return container;
}

function createChapterSelectorPlaceholder() {
    const placeholder = h("div", {
        className: "w-full mb-6 hidden",
        "data-viewer-only": "true",
        id: "chapter-selector-placeholder",
    });
    return placeholder;
}

// Brutalist divider - thick black/white block instead of subtle line
const createDivider = (viewerOnly = false) =>
    h("div", {
        className: "w-full h-1 bg-black dark:bg-white my-6 border-y-2 border-black dark:border-white",
        "data-viewer-only": viewerOnly ? "true" : undefined,
    });

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
        "RETURN TO LIBRARY (Esc)",
        returnToHome,
        "brutal-shadow-accent",
    );
    setAttribute(homeButton, { "data-viewer-only": "true" });

    toggleContainer.innerHTML = "";
    toggleContainer.append(sidebarToggleButton, homeButton);

    sidebarElement.innerHTML = "";

    // CONFIG / SETTINGS Button
    const settingsText = h("span", {}, "SETTINGS");
    const settingsIcon = h("i", { "data-lucide": "settings", height: "20", "stroke-width": "3", width: "20" });
    const settingsButton = h(
        "button",
        {
            className:
                "w-full flex items-center justify-between p-3 bg-white dark:bg-black text-black dark:text-white brutal-border font-space font-bold uppercase tracking-widest transition-all hover:bg-[#FF3366] hover:text-white hover:border-[#FF3366] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none",
            id: "settings-button",
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
        appendTo: true,
        buttonClass:
            "!border-2 !border-black dark:!border-white !bg-paper dark:!bg-ink !text-black dark:!text-white hover:!bg-[#FF3366] hover:!text-white brutal-shadow",
        container: chapterSelectorPlaceholder,
        items: [{ text: "NO DATA", value: "" }],
        onChange: jumpToChapter,
        placeholder: "SELECT CH.",
        scroll: true,
        searchable: true,
        width: "w-full",
    });
    AppEvents.addEventListener("chapterSelectorSync", (e) =>
        syncChapterSelectorOptions(e.detail.totalChapters, e.detail.currentChapter),
    );

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
              text: `CH. ${(i + 1).toString().padStart(3, "0")}`,
              value: i,
          }))
        : [{ text: "NO DATA", value: "" }];

    chapterSelectInstance.setOptions(options, hasChapters ? currentChapter : "");
    if (placeholder) toggleClass(placeholder, "opacity-50 pointer-events-none grayscale", !hasChapters);
}
