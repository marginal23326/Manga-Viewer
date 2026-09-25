import { CurrentProgress, PersistState, ViewerState, getCurrentManga } from "@/state";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { addClass, h, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { createIconButton, setIcon } from "@/core/icons";
import { formatZoomLevel, resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import type { SidebarMode } from "@/types";
import { createThemeSegmentedControl } from "./theme";
import { goToChapter } from "@/viewer/chapter";
import { isLightboxOpen } from "@/viewer/lightbox";
import { navigateTo } from "./hash-route";
import { observeHoverReveal } from "@/core/hover-reveal";
import { openSettings } from "@/settings";
import { toInt } from "@/core/utils";

export const sidebarElement = h("aside", {
    className:
        "fixed top-0 left-0 h-full w-0 bg-paper/90 dark:bg-ink/90 border-r divider-line z-40 transition-all duration-300 ease-out flex flex-col items-center py-6 overflow-y-auto no-scrollbar",
    id: "sidebar",
});

export const sidebarToggleContainer = h("div", {
    className: "fixed top-5 left-5 z-50 flex flex-row gap-2",
    hidden: true,
    id: "sidebar-toggle-container",
});

let sidebarToggleButton: HTMLButtonElement | null = null;
let chapterSelectInstance: SelectInstance | null = null;
let mangaTitleElement: HTMLDivElement | null = null;
let chapterSectionElement: HTMLDivElement | null = null;

export function toggleSidebarPin(): void {
    PersistState.update("sidebarMode", PersistState.sidebarMode === "open" ? "hover" : "open");
}

function applySidebarMode(mode: SidebarMode): void {
    if (!sidebarToggleButton) return;

    const pinned = mode === "open";
    sidebarToggleButton.title = `${pinned ? "Unpin" : "Pin"} sidebar (Ctrl+B)`;
    setIcon(sidebarToggleButton, pinned ? "PanelLeftOpen" : "PanelLeft", { size: 18 });
    setSidebarVisualState(pinned);
}

function setSidebarVisualState(isOpen: boolean): void {
    toggleClass(sidebarElement, "is-open", isOpen);
}

function createSectionLabel(text: string): HTMLHeadingElement {
    return h("h3", { className: "eyebrow mb-2" }, text);
}

function createZoomControls(): { element: HTMLDivElement; zoomLevelDisplay: HTMLSpanElement } {
    const zoomLevelDisplay = h(
        "span",
        { className: "font-mono text-xs font-medium text-muted tracking-wide" },
        formatZoomLevel(CurrentProgress.zoomLevel),
    );

    const header = h(
        "div",
        { className: "flex items-center justify-between w-full mb-2" },
        createSectionLabel("Zoom"),
        zoomLevelDisplay,
    );

    const buttonsContainer = h("div", {
        className: "flex flex-row items-center w-full rounded-full surface p-1 gap-0.5",
    });

    const zoomBtnClass = "btn-icon flex-1 w-auto! rounded-full!";

    buttonsContainer.append(
        createIconButton("ZoomOut", {
            className: zoomBtnClass,
            iconOptions: { size: 16 },
            onClick: zoomOut,
            tooltip: "Zoom out (-)",
        }),
        createIconButton("Undo2", {
            className: zoomBtnClass,
            iconOptions: { size: 16 },
            onClick: resetZoom,
            tooltip: "Reset (=)",
        }),
        createIconButton("ZoomIn", {
            className: zoomBtnClass,
            iconOptions: { size: 16 },
            onClick: zoomIn,
            tooltip: "Zoom in (+)",
        }),
    );

    const element = h("div", { className: "flex flex-col items-stretch w-full mb-6" }, header, buttonsContainer);
    return { element, zoomLevelDisplay };
}

function syncMangaContext(): void {
    const currentManga = getCurrentManga();
    if (!mangaTitleElement || !currentManga) return;

    setText(mangaTitleElement, currentManga.title);
    mangaTitleElement.title = currentManga.title;

    const hasChapters = currentManga.totalChapters > 0;
    setVisible(chapterSectionElement, hasChapters);
    if (!hasChapters) return;

    chapterSelectInstance?.setOptions(
        Array.from({ length: currentManga.totalChapters }, (_, i) => ({ text: `Chapter ${i + 1}`, value: String(i) })),
        String(CurrentProgress.currentChapter),
    );
}

function syncSidebarForView(mangaId: string | null): void {
    const showingViewer = mangaId !== null;
    setVisible(sidebarToggleContainer, showingViewer);

    if (showingViewer) {
        applySidebarMode(PersistState.sidebarMode);
        syncMangaContext();
    } else {
        setSidebarVisualState(false);
    }
}

export function initSidebar(): void {
    sidebarToggleButton = createIconButton("PanelLeft", {
        className: "btn-icon-solid",
        iconOptions: { size: 18 },
        onClick: toggleSidebarPin,
        tooltip: "Pin sidebar (Ctrl+B)",
    });
    const homeButton = createIconButton("Home", {
        className: "btn-icon-solid",
        iconOptions: { size: 18 },
        onClick: () => navigateTo({ name: "library" }),
        tooltip: "Return to library (Esc)",
    });
    sidebarToggleContainer.replaceChildren(sidebarToggleButton, homeButton);

    mangaTitleElement = h("div", {
        className:
            "w-full pb-4 mb-6 border-b divider-line text-[15px] font-semibold tracking-tight text-ink dark:text-paper truncate",
    });

    chapterSelectInstance = createSelect({
        onChange: (selectedValue) => goToChapter(toInt(selectedValue)),
        placeholder: "Select chapter",
        scroll: true,
        searchable: true,
        width: "w-full",
    });
    addClass(chapterSelectInstance.element, "w-full");
    chapterSectionElement = h(
        "div",
        { className: "w-full mb-6" },
        createSectionLabel("Chapter"),
        chapterSelectInstance.element,
    );

    const zoomControls = createZoomControls();

    const footer = h(
        "div",
        { className: "w-full flex items-center justify-between pt-4 mt-auto border-t divider-line" },
        createThemeSegmentedControl(),
        createIconButton("Settings", {
            className: "btn-icon",
            iconOptions: { size: 18 },
            onClick: openSettings,
            tooltip: "Settings (Shift+S)",
        }),
    );

    sidebarElement.replaceChildren(mangaTitleElement, chapterSectionElement, zoomControls.element, footer);

    CurrentProgress.onChange("currentChapter", syncMangaContext);
    PersistState.onChange("mangaList", syncMangaContext);
    CurrentProgress.onChange("zoomLevel", (zoomLevel) =>
        setText(zoomControls.zoomLevelDisplay, formatZoomLevel(zoomLevel)),
    );

    observeHoverReveal(
        (event) => {
            if (ViewerState.currentMangaId === null) return false;
            if (PersistState.sidebarMode === "open") return true;
            if (isLightboxOpen()) return false;
            const target = event.target as Node | null;
            if (sidebarToggleButton?.contains(target) || sidebarElement.contains(target)) return true;
            if (chapterSelectInstance?.isOpen()) return true;
            return false;
        },
        () => setSidebarVisualState(true),
        () => setSidebarVisualState(false),
    );
    ViewerState.onChange("currentMangaId", syncSidebarForView, { immediate: true });
    PersistState.onChange("sidebarMode", applySidebarMode);
}
