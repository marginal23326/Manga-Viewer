import { CurrentProgress, PersistState, getCurrentManga, getTotalChapters } from "@/state";
import { type CurrentView, type SidebarMode } from "@/types";
import { DOM, addClass, h, setAttribute, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { createIconButton, iconSvg, setIcon } from "@/core/icons";
import { formatZoomLevel, resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import { createHoverReveal } from "@/core/hover-reveal";
import { isLightboxOpen } from "@/viewer/lightbox";
import { loadChapterImages } from "@/viewer/chapter";
import { openSettings } from "@/settings";
import { returnToHome } from "./view-router";
import { toInt } from "@/core/utils";

let sidebarElement: HTMLElement | null = null;
let sidebarToggleButton: HTMLButtonElement | null = null;
let chapterSelectInstance: SelectInstance | null = null;

const sidebarHoverReveal = createHoverReveal(
    (event) => {
        if (isLightboxOpen() || PersistState.currentView !== "viewer") return false;
        const target = event.target as Node | null;
        if (sidebarToggleButton?.contains(target) || sidebarElement?.contains(target)) return true;
        if (chapterSelectInstance?.isOpen()) return true;
        return false;
    },
    () => setSidebarVisualState(true),
    () => setSidebarVisualState(false),
);

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

export function toggleSidebarPin(): void {
    const nextMode = PersistState.sidebarMode === "open" ? "hover" : "open";
    if (PersistState.update("sidebarMode", nextMode)) {
        applySidebarMode(nextMode);
    }
}

function applySidebarMode(mode: SidebarMode): void {
    if (!sidebarElement || !sidebarToggleButton) return;

    sidebarHoverReveal.deactivate();

    const pinned = mode === "open";
    setAttribute(sidebarToggleButton, { title: `${pinned ? "Unpin" : "Pin"} sidebar (Ctrl+B)` });
    setIcon(sidebarToggleButton, pinned ? "PanelLeftOpen" : "PanelLeft", { size: 18 });

    if (pinned) setSidebarVisualState(true);
    else {
        setSidebarVisualState(false);
        sidebarHoverReveal.activate();
    }
}

function setSidebarVisualState(isOpen: boolean): void {
    if (!sidebarElement || sidebarElement.dataset.open === String(isOpen)) return;
    sidebarElement.dataset.open = String(isOpen);
}

function createZoomControls(): { element: HTMLDivElement; zoomLevelDisplay: HTMLDivElement } {
    const zoomLevelDisplay = h(
        "div",
        {
            className: "font-mono text-xs font-medium text-ink/50 dark:text-paper/45 mb-2 text-center tracking-wide",
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

    const element = h("div", {
        className: "flex flex-col items-stretch w-full mb-6",
    });
    element.append(zoomLevelDisplay, buttonsContainer);
    return { element, zoomLevelDisplay };
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
        onClick: toggleSidebarPin,
        tooltip: "Pin sidebar (Ctrl+B)",
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

    chapterSelectInstance = createSelect({
        items: [{ text: "No chapters", value: "" }],
        onChange: jumpToChapter,
        placeholder: "Select chapter",
        scroll: true,
        searchable: true,
        width: "w-full",
    });
    addClass(chapterSelectInstance.element, "w-full mb-6");

    const zoomControls = createZoomControls();

    sidebarElement.replaceChildren(
        createDivider(),
        zoomControls.element,
        chapterSelectInstance.element,
        createDivider(),
        settingsButton,
    );

    addClass(sidebarElement, "flex flex-col items-center justify-start");

    CurrentProgress.onChange("currentChapter", syncChapterSelectorForCurrentManga);
    PersistState.onChange("mangaList", syncChapterSelectorForCurrentManga);
    CurrentProgress.onChange("zoomLevel", (zoomLevel) =>
        setText(zoomControls.zoomLevelDisplay, formatZoomLevel(zoomLevel)),
    );

    syncSidebarForView(PersistState.currentView);
    PersistState.onChange("currentView", syncSidebarForView);
}

function syncChapterSelectorOptions(totalChapters: number, currentChapter: number): void {
    if (!chapterSelectInstance) {
        return;
    }
    const hasChapters = totalChapters > 0;

    const options = hasChapters
        ? Array.from({ length: totalChapters }, (_, i) => ({
              text: `Chapter ${i + 1}`,
              value: String(i),
          }))
        : [{ text: "No chapters", value: "" }];

    chapterSelectInstance.setOptions(options, hasChapters ? String(currentChapter) : "");
    toggleClass(chapterSelectInstance.element, "opacity-40 pointer-events-none", !hasChapters);
}
