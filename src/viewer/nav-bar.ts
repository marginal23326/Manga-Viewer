import { DOM, h, setAttribute, setText, setVisible } from "@/core/dom-utils";
import { CurrentSettings, PersistState, UIState, ViewerState } from "@/state";
import { createIconButton, setIcon } from "@/core/icons";
import { goToFirstChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./chapter";
import { createHoverReveal } from "@/core/hover-reveal";
import { isLightboxOpen } from "./lightbox";
import { toggleFullScreen } from "@/core/fullscreen";

let navContainerElement: HTMLElement | null = null;
let imageRangeElement: HTMLElement | null = null;
let fullscreenButton: HTMLButtonElement | null = null;

function hideNav(): void {
    UIState.update("isNavVisible", false);
}

const navHoverReveal = createHoverReveal(
    (e) => {
        if (PersistState.currentView !== "viewer" || isLightboxOpen() || !CurrentSettings.navBarEnabled) return false;
        const navHeight = navContainerElement?.offsetHeight ?? 80;
        const bufferZonePixels = innerWidth * 0.2;
        return e.clientY < navHeight * 1.5 && e.clientX > bufferZonePixels && e.clientX < innerWidth - bufferZonePixels;
    },
    () => UIState.update("isNavVisible", true),
    hideNav,
);

function updateImageRangeDisplay(start: number, end: number, total: number): void {
    setText(imageRangeElement, total > 0 ? `${start}–${end} / ${total}` : "—");
}

// Update the fullscreen button icon based on fullscreen state
function updateFullscreenIcon(isFullscreen: boolean): void {
    if (!fullscreenButton) return;

    setIcon(fullscreenButton, isFullscreen ? "Minimize" : "Maximize", { size: 17 });
    setAttribute(fullscreenButton, { title: `${isFullscreen ? "Exit" : "Enter"} fullscreen (f)` });
}

function syncNavVisibility(visible: boolean): void {
    if (!navContainerElement) return;
    navContainerElement.dataset.visible = String(visible);
}

export function initNavigation(): void {
    navContainerElement = DOM.navContainer;
    if (!navContainerElement) return;

    const iconOptions = { size: 17 };

    const firstBtn = createIconButton("ChevronsLeft", {
        className: "btn-icon",
        iconOptions,
        id: "first-button",
        onClick: goToFirstChapter,
        tooltip: "First chapter (h)",
    });
    const prevBtn = createIconButton("ChevronLeft", {
        className: "btn-icon",
        iconOptions,
        id: "prev-button",
        onClick: loadPreviousChapter,
        tooltip: "Previous chapter (Alt+Left)",
    });
    const nextBtn = createIconButton("ChevronRight", {
        className: "btn-icon",
        iconOptions,
        id: "next-button",
        onClick: loadNextChapter,
        tooltip: "Next chapter (Alt+Right)",
    });
    const lastBtn = createIconButton("ChevronsRight", {
        className: "btn-icon",
        iconOptions,
        id: "last-button",
        onClick: goToLastChapter,
        tooltip: "Last chapter (l)",
    });
    const fullscreenBtn = createIconButton("Maximize", {
        className: "btn-icon",
        iconOptions,
        onClick: toggleFullScreen,
        tooltip: "Toggle fullscreen (f)",
    });
    fullscreenButton = fullscreenBtn;

    imageRangeElement = h("div", {
        className:
            "font-mono text-xs font-medium text-ink/55 dark:text-paper/50 px-3 flex items-center justify-center min-w-[100px] whitespace-nowrap",
        id: "image-range-display",
    });
    updateImageRangeDisplay(0, 0, 0);

    const centerGroup = h("div", { className: "flex items-center gap-0.5" }, prevBtn, imageRangeElement, nextBtn);

    const separator = h("div", { className: "w-px h-6 bg-line dark:bg-line-dark mx-1.5" });

    navContainerElement.replaceChildren(firstBtn, centerGroup, lastBtn, separator, fullscreenBtn);

    updateFullscreenIcon(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    navHoverReveal.activate();
    UIState.onChange("isNavVisible", syncNavVisibility, { immediate: true });
    PersistState.onChange("currentView", (view) => {
        if (view !== "viewer") hideNav();
    });
    CurrentSettings.onChange("navBarEnabled", applyNavBarEnabled, { immediate: true });
    ViewerState.onChange("imageRange", ({ start, end, total }) => updateImageRangeDisplay(start, end, total));
}

function handleFullscreenChange(): void {
    updateFullscreenIcon(Boolean(document.fullscreenElement));
}

function applyNavBarEnabled(): void {
    if (!navContainerElement) return;

    if (CurrentSettings.navBarEnabled) {
        setVisible(navContainerElement, true);
    } else {
        hideNav();
        setVisible(navContainerElement, false);
    }
}
