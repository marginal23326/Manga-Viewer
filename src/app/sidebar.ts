import { $, DOM, addClass, h, setAttribute, setVisible, toggleClass } from "@/core/dom-utils";
import { CurrentProgress, PersistState, getCurrentManga, getTotalChapters } from "@/state";
import { type CurrentView, SIDEBAR_MODES, type SidebarMode } from "@/types";
import { type IconName, createIconButton, iconSvg, setIcon } from "@/core/icons";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { debounce, renewController, toInt } from "@/core/utils";
import { formatZoomLevel, resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import Config from "@/core/config";
import { isLightboxOpen } from "@/viewer/lightbox";
import { loadChapterImages } from "@/viewer/chapter";
import { onAppEvent } from "@/core/app-events";
import { openSettings } from "@/settings";
import { returnToHome } from "./view-router";

let sidebarElement: HTMLElement | null = null;
let sidebarToggleButton: HTMLButtonElement | null = null;
let chapterSelectInstance: SelectInstance | null = null;
let hoverController = new AbortController();
let isSidebarVisuallyOpen = false;

const revealSidebar = debounce(() => setSidebarVisualState(true), Config.SIDEBAR_HOVER_DELAY_MS);

function jumpToChapter(selectedValue: string): void {
    const manga = getCurrentManga();
    if (!manga || selectedValue === "") return;

    const chapterIndex = toInt(selectedValue);
    if (chapterIndex >= 0 && chapterIndex < getTotalChapters(manga)) {
        loadChapterImages(chapterIndex);
    } else {
        console.warn("Invalid chapter selected:", selectedValue);
    }
}

export function cycleSidebarMode(): void {
    const currentModeIndex = SIDEBAR_MODES.indexOf(PersistState.sidebarMode);
    const nextMode = SIDEBAR_MODES[(currentModeIndex + 1) % SIDEBAR_MODES.length] ?? "hover";
    if (PersistState.update("sidebarMode", nextMode)) {
        applySidebarMode(nextMode);
    }
}

function applySidebarMode(mode: SidebarMode): void {
    if (!sidebarElement || !sidebarToggleButton) return;
    const toggleButton = sidebarToggleButton;

    hoverController = renewController(hoverController);
    revealSidebar.cancel();

    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
    setAttribute(toggleButton, { title: `${modeLabel} panel (Ctrl+B)` });

    const iconMap: Partial<Record<SidebarMode, IconName>> = { closed: "PanelLeftClose", open: "PanelLeftOpen" };
    setIcon(toggleButton, iconMap[mode] ?? "PanelLeft", { size: 18 });

    const isOpen = mode === "open";
    const useHover = mode === "hover";

    setSidebarVisualState(isOpen || (useHover && isSidebarVisuallyOpen));

    if (useHover) {
        document.addEventListener("mousemove", handleMousePosition, { signal: hoverController.signal });
    }
}

function setSidebarVisualState(isOpen: boolean): void {
    if (!sidebarElement) return;

    isSidebarVisuallyOpen = isOpen;
    sidebarElement.dataset.open = String(isOpen);
}

const handleMousePosition = (event: MouseEvent): void => {
    if (isLightboxOpen() || !sidebarElement || PersistState.currentView !== "viewer") return;
    const sidebar = sidebarElement;

    const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY_PX;
    const toggleContainer = DOM.sidebarToggleContainer;
    const target = event.target as Node | null;
    const isOverInteractiveArea = sidebar.contains(target) || Boolean(toggleContainer?.contains(target));

    revealSidebar.cancel();

    if (isNearEdge && !isOverInteractiveArea && !isSidebarVisuallyOpen) {
        revealSidebar();
    } else if (!isNearEdge && !isOverInteractiveArea && !chapterSelectInstance?.isOpen()) {
        setSidebarVisualState(false);
    }
};

function createZoomControls(): HTMLDivElement {
    const zoomLevelDisplay = h(
        "div",
        {
            className: "font-mono text-xs font-medium text-ink/50 dark:text-paper/45 mb-2 text-center tracking-wide",
            id: "zoom-level-display",
        },
        formatZoomLevel(CurrentProgress.zoomLevel),
    );

    const buttonsContainer = h("div", {
        className: "flex flex-row items-center w-full rounded-full surface p-1 gap-0.5",
    });

    const zoomBtnClass = "btn-icon flex-1 !w-auto !rounded-full";

    const zoomOutBtn = createIconButton("ZoomOut", {
        className: zoomBtnClass,
        iconOptions: { size: 16 },
        id: "zoom-out-button",
        onClick: zoomOut,
        tooltip: "Zoom out (-)",
    });
    const zoomResetBtn = createIconButton("Undo2", {
        className: zoomBtnClass,
        iconOptions: { size: 16 },
        id: "zoom-reset-button",
        onClick: resetZoom,
        tooltip: "Reset (=)",
    });
    const zoomInBtn = createIconButton("ZoomIn", {
        className: zoomBtnClass,
        iconOptions: { size: 16 },
        id: "zoom-in-button",
        onClick: zoomIn,
        tooltip: "Zoom in (+)",
    });

    buttonsContainer.append(zoomOutBtn, zoomResetBtn, zoomInBtn);

    const container = h("div", {
        className: "flex flex-col items-stretch w-full mb-6",
    });
    container.append(zoomLevelDisplay, buttonsContainer);
    return container;
}

function createChapterSelectorPlaceholder(): HTMLDivElement {
    return h("div", {
        className: "w-full mb-6",
        id: "chapter-selector-placeholder",
    });
}

const createDivider = (): HTMLDivElement =>
    h("div", {
        className: "w-full h-px bg-line dark:bg-line-dark my-6",
    });

function syncChapterSelectorForCurrentManga(): void {
    const currentManga = getCurrentManga();
    if (currentManga) {
        syncChapterSelectorOptions(getTotalChapters(currentManga), CurrentProgress.currentChapter);
    }
}

function syncSidebarForView(view: CurrentView): void {
    setVisible(DOM.sidebarToggleContainer, view === "viewer");

    if (view === "viewer") {
        applySidebarMode(PersistState.sidebarMode);
        syncChapterSelectorForCurrentManga();
    } else {
        setSidebarVisualState(false);
    }
}

export function initSidebar(): void {
    sidebarElement = DOM.sidebar;
    if (!sidebarElement) return;

    const toggleContainer = DOM.sidebarToggleContainer;
    if (!toggleContainer) return;
    addClass(toggleContainer, "flex flex-row gap-2");

    sidebarToggleButton = createIconButton("PanelLeft", {
        className: "btn-icon-solid",
        iconOptions: { size: 18 },
        id: "sidebar-toggle-button",
        onClick: cycleSidebarMode,
        tooltip: "Toggle panel (Ctrl+B)",
    });
    const homeButton = createIconButton("Home", {
        className: "btn-icon-solid",
        iconOptions: { size: 18 },
        id: "return-to-home",
        onClick: returnToHome,
        tooltip: "Return to library (Esc)",
    });

    toggleContainer.replaceChildren(sidebarToggleButton, homeButton);

    // Settings button
    const settingsText = h("span", { className: "font-medium text-sm" }, "Settings");
    const settingsIcon = iconSvg("Settings", { size: 18 });
    const settingsButton = h(
        "button",
        {
            className:
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-ink dark:text-paper calm-transition hover:bg-ink/[0.05] dark:hover:bg-white/[0.06] focus-ring cursor-pointer",
            id: "settings-button",
        },
        settingsText,
        settingsIcon,
    );
    settingsButton.addEventListener("click", openSettings);

    const chapterSelectorPlaceholder = createChapterSelectorPlaceholder();

    sidebarElement.replaceChildren(
        createDivider(),
        createZoomControls(),
        chapterSelectorPlaceholder,
        createDivider(),
        settingsButton,
    );

    addClass(sidebarElement, "flex flex-col items-center justify-start");

    // Re-init the custom select inside the sidebar
    chapterSelectInstance = createSelect({
        appendTo: true,
        container: chapterSelectorPlaceholder,
        items: [{ text: "No chapters", value: "" }],
        onChange: jumpToChapter,
        placeholder: "Select chapter",
        scroll: true,
        searchable: true,
        width: "w-full",
    });
    onAppEvent("chapterSelectorSync", (event) =>
        syncChapterSelectorOptions(event.detail.totalChapters, event.detail.currentChapter),
    );

    syncSidebarForView(PersistState.currentView);
    PersistState.onChange("currentView", syncSidebarForView);
}

function syncChapterSelectorOptions(totalChapters: number, currentChapter: number): void {
    if (!chapterSelectInstance) {
        return;
    }
    const placeholder = $("#chapter-selector-placeholder", sidebarElement ?? document);
    const hasChapters = totalChapters > 0;

    const options = hasChapters
        ? Array.from({ length: totalChapters }, (_, i) => ({
              text: `Chapter ${i + 1}`,
              value: String(i),
          }))
        : [{ text: "No chapters", value: "" }];

    chapterSelectInstance.setOptions(options, hasChapters ? String(currentChapter) : "");
    if (placeholder) toggleClass(placeholder, "opacity-40 pointer-events-none", !hasChapters);
}
