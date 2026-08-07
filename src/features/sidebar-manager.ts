import { $, DOM, addClass, h, removeClass, setAttribute, toggleClass } from "@/core/dom-utils";
import { type IconName, createIconButton as createBaseIconButton, iconSvg } from "@/core/icons";
import { LightboxState, PersistState } from "@/state/state";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { resetZoom, zoomIn, zoomOut } from "./zoom-manager";
import Config from "@/core/config";
import type { SidebarMode } from "@/types";
import { getSettings } from "@/state/manga-settings";
import { onAppEvent } from "@/core/app-events";
import { openSettings } from "./settings-manager";
import { resetScrollAndLoadChapter } from "./image-manager";
import { returnToHome } from "@/ui/viewer-ui";
import { toInt } from "@/core/utils";
import { updateViewerControlsVisibility } from "@/ui/viewer-controls";
import { withCurrentManga } from "@/state/manga-library";

let sidebarElement: HTMLElement | null = null;
let sidebarToggleButton: HTMLButtonElement | null = null;
let homeButton: HTMLButtonElement | null = null;
let chapterSelectInstance: SelectInstance | null = null;
let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
let mouseMoveListener: ((event: MouseEvent) => void) | null = null;
let isSidebarVisuallyOpen = false;

function jumpToChapter(selectedValue: string): void {
    withCurrentManga((manga) => {
        if (selectedValue === "") return;

        const chapterIndex = toInt(selectedValue);
        if (chapterIndex >= 0 && chapterIndex < manga.totalChapters) {
            resetScrollAndLoadChapter(chapterIndex);
        } else {
            console.warn("Invalid chapter selected:", selectedValue);
        }
    });
}

// Brutalist button factory
function createIconButton(
    id: string,
    iconName: IconName,
    tooltip: string,
    clickHandler: () => void,
    additionalClasses = "",
): HTMLButtonElement {
    return createBaseIconButton(iconName, {
        className: `btn-icon-accent p-3 bg-paper/60 dark:bg-ink/60 backdrop-blur-md hover:-translate-y-1 hover:-translate-x-1 hover:!bg-opacity-100 hover:brutal-shadow ${additionalClasses}`,
        iconClassName: "flex-shrink-0",
        id,
        onClick: clickHandler,
        tooltip,
    });
}

export function cycleSidebarMode(): void {
    const modes: SidebarMode[] = ["hover", "open", "closed"];
    const currentModeIndex = modes.indexOf(PersistState.sidebarMode);
    const nextMode = modes[(currentModeIndex + 1) % modes.length] ?? "hover";
    if (PersistState.update("sidebarMode", nextMode)) {
        applySidebarMode(nextMode);
    }
}

function applySidebarMode(mode: SidebarMode): void {
    if (!sidebarElement || !DOM.mainContent || !sidebarToggleButton) return;
    const toggleButton = sidebarToggleButton;

    if (mouseMoveListener) {
        document.removeEventListener("mousemove", mouseMoveListener);
        mouseMoveListener = null;
    }
    clearTimeout(hoverTimeout);
    hoverTimeout = undefined;

    setAttribute(toggleButton, { title: `${mode.toUpperCase()} MODE (Ctrl+B)` });

    const iconMap: Partial<Record<SidebarMode, IconName>> = { closed: "PanelLeftClose", open: "PanelLeftOpen" };
    const iconName = iconMap[mode] ?? "PanelLeft";

    toggleButton.innerHTML = "";
    // Thicker stroke for brutalist toggle icon
    toggleButton.append(iconSvg(iconName));

    const isOpen = mode === "open";
    const useHover = mode === "hover";

    setSidebarVisualState(isOpen || (useHover && isSidebarVisuallyOpen));

    if (useHover) {
        mouseMoveListener = handleMousePosition;
        document.addEventListener("mousemove", mouseMoveListener);
    }
}

function setSidebarVisualState(isOpen: boolean): void {
    if (!sidebarElement || !DOM.mainContent) return;

    isSidebarVisuallyOpen = isOpen;

    if (isOpen) {
        removeClass(sidebarElement, "w-0");
        addClass(sidebarElement, "w-64 pt-20 px-4 bg-paper/90 dark:bg-ink/90 backdrop-blur-xl brutal-edge-shadow");
    } else {
        removeClass(sidebarElement, "w-64 pt-20 px-4 brutal-edge-shadow");
        addClass(sidebarElement, "w-0 overflow-hidden");
    }
}

const handleMousePosition = (event: MouseEvent): void => {
    if (LightboxState.isOpen || !sidebarElement) return;
    const sidebar = sidebarElement;

    const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY_PX;
    const toggleContainer = DOM.sidebarToggleContainer;
    const target = event.target as Node | null;
    const isOverInteractiveArea = sidebar.contains(target) || Boolean(toggleContainer?.contains(target));

    clearTimeout(hoverTimeout);
    hoverTimeout = undefined;

    if (isNearEdge && !isOverInteractiveArea && !isSidebarVisuallyOpen) {
        hoverTimeout = setTimeout(() => {
            setSidebarVisualState(true);
            hoverTimeout = undefined;
        }, Config.SIDEBAR_HOVER_DELAY_MS);
    } else if (!isNearEdge && !isOverInteractiveArea && !chapterSelectInstance?.isOpen()) {
        setSidebarVisualState(false);
    }
};

function createZoomControls(): HTMLDivElement {
    const zoomLevelDisplay = h(
        "div",
        {
            className:
                "text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white bg-accent text-white px-2 py-1 brutal-border mb-2 text-center brutal-shadow-sm",
            id: "zoom-level-display",
        },
        "ZOOM: 100%",
    );

    const buttonsContainer = h("div", {
        className: "flex flex-row items-center w-full brutal-shadow",
    });

    const zoomOutBtn = createIconButton(
        "zoom-out-button",
        "ZoomOut",
        "ZOOM OUT (-)",
        zoomOut,
        "flex-1 !shadow-none border-r-0",
    );
    const zoomResetBtn = createIconButton(
        "zoom-reset-button",
        "Undo2",
        "RESET (=)",
        resetZoom,
        "flex-1 !shadow-none border-r-0",
    );
    const zoomInBtn = createIconButton("zoom-in-button", "ZoomIn", "ZOOM IN (+)", zoomIn, "flex-1 !shadow-none");

    buttonsContainer.append(zoomOutBtn, zoomResetBtn, zoomInBtn);

    const container = h("div", {
        className: "flex flex-col items-stretch w-full mb-6",
        "data-viewer-only": "true",
    });
    container.append(zoomLevelDisplay);
    container.append(buttonsContainer);
    return container;
}

function createChapterSelectorPlaceholder(): HTMLDivElement {
    return h("div", {
        className: "w-full mb-6 hidden",
        "data-viewer-only": "true",
        id: "chapter-selector-placeholder",
    });
}

// Brutalist divider - thick black/white block instead of subtle line
const createDivider = (viewerOnly = false): HTMLDivElement =>
    h("div", {
        className: "w-full h-1 bg-black dark:bg-white my-6 border-y-2 border-black dark:border-white",
        "data-viewer-only": viewerOnly ? "true" : undefined,
    });

export function initSidebar(): void {
    sidebarElement = DOM.sidebar;
    if (!sidebarElement) return;
    addClass(sidebarElement, "bg-opacity-90 dark:bg-opacity-90 backdrop-blur-xl");

    const toggleContainer = DOM.sidebarToggleContainer;
    if (!toggleContainer) return;
    // Ensure the container is visible and styled correctly
    removeClass(toggleContainer, "mix-blend-difference text-white");
    addClass(toggleContainer, "flex flex-row space-x-2");

    sidebarToggleButton = createIconButton(
        "sidebar-toggle-button",
        "PanelLeft",
        "TOGGLE PANEL",
        cycleSidebarMode,
        "brutal-shadow-accent",
    );
    homeButton = createIconButton(
        "return-to-home",
        "Home",
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
    const settingsIcon = iconSvg("Settings", { size: 20 });
    const settingsButton = h(
        "button",
        {
            className:
                "w-full flex items-center justify-between p-3 bg-white dark:bg-black text-black dark:text-white brutal-border font-space font-bold uppercase tracking-widest transition-all hover:bg-accent hover:text-white hover:border-accent brutal-box-hover",
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
            "!border-2 !border-black dark:!border-white !bg-paper dark:!bg-ink !text-black dark:!text-white hover:!bg-accent hover:!text-white brutal-shadow",
        container: chapterSelectorPlaceholder,
        items: [{ text: "NO DATA", value: "" }],
        onChange: jumpToChapter,
        placeholder: "SELECT CH.",
        scroll: true,
        searchable: true,
        width: "w-full",
    });
    onAppEvent("chapterSelectorSync", (event) =>
        syncChapterSelectorOptions(event.detail.totalChapters, event.detail.currentChapter),
    );

    // Initial state setup
    applySidebarMode(PersistState.sidebarMode);
    updateViewerControlsVisibility(PersistState.currentView === "viewer");

    if (PersistState.currentView === "viewer") {
        withCurrentManga((currentManga) => {
            const settings = getSettings(currentManga.id);
            syncChapterSelectorOptions(currentManga.totalChapters, settings.currentChapter ?? 0);
        });
    }
}

function syncChapterSelectorOptions(totalChapters: number, currentChapter: number): void {
    if (!chapterSelectInstance) {
        return;
    }
    const placeholder = $("#chapter-selector-placeholder", sidebarElement ?? document);
    const hasChapters = totalChapters > 0;

    // Formatting chapter text like archival logs
    const options = hasChapters
        ? Array.from({ length: totalChapters }, (_, i) => ({
              text: `CH. ${(i + 1).toString().padStart(3, "0")}`,
              value: String(i),
          }))
        : [{ text: "NO DATA", value: "" }];

    chapterSelectInstance.setOptions(options, hasChapters ? String(currentChapter) : "");
    if (placeholder) toggleClass(placeholder, "opacity-50 pointer-events-none grayscale", !hasChapters);
}
