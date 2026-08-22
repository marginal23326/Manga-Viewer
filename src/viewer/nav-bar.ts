import { $, DOM, h, setAttribute, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { PersistState, UIState } from "@/state";
import { createIconButton, setIcon } from "@/core/icons";
import { goToFirstChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./chapter";
import { isLightboxOpen } from "./lightbox";
import { onAppEvent } from "@/core/app-events";
import { toggleFullScreen } from "@/core/fullscreen";

let navContainerElement: HTMLElement | null = null;
let imageRangeElement: HTMLElement | null = null;
let navBarEnabled = true;

function updateImageRangeDisplay(start: number, end: number, total: number): void {
    setText(imageRangeElement, total > 0 ? `${start}–${end} / ${total}` : "—");
}

onAppEvent("imageRangeChanged", ({ detail }) => updateImageRangeDisplay(detail.start, detail.end, detail.total));

// Update the fullscreen button icon based on fullscreen state
function updateFullscreenIcon(isFullscreen: boolean): void {
    if (!navContainerElement) return;
    const button = $("#fullscreen-button", navContainerElement);
    if (!button) return;

    setIcon(button, isFullscreen ? "Minimize" : "Maximize", { size: 17, strokeWidth: 2 });
    setAttribute(button, { title: `${isFullscreen ? "Exit" : "Enter"} fullscreen (f)` });
}

export function initNavigation(): void {
    navContainerElement = DOM.navContainer;
    if (!navContainerElement) return;

    const iconOptions = { size: 17, strokeWidth: 2 };

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
        id: "fullscreen-button",
        onClick: toggleFullScreen,
        tooltip: "Toggle fullscreen (f)",
    });

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
    document.addEventListener("mousemove", handleNavMouseMove);
    onAppEvent("navHideRequested", hideNav);
}

function handleFullscreenChange(): void {
    updateFullscreenIcon(Boolean(document.fullscreenElement));
}

// Simple mouse move handler for nav visibility
let navHideTimeout: ReturnType<typeof setTimeout> | undefined;
const NAV_HIDE_INACTIVITY_MS = 3000;
const NAV_HIDE_LEAVE_MS = 30;

function handleNavMouseMove(event: MouseEvent): void {
    if (PersistState.currentView !== "viewer" || isLightboxOpen() || !navBarEnabled) {
        hideNav();
        return;
    }

    const navHeight = navContainerElement?.offsetHeight || 80;
    const topTriggerZone = navHeight * 1.5;
    const sideBufferZonePercent = 0.2;
    const bufferZonePixels = window.innerWidth * sideBufferZonePercent;

    const isInVerticalZone = event.clientY < topTriggerZone;
    const isInHorizontalZone = event.clientX > bufferZonePixels && event.clientX < window.innerWidth - bufferZonePixels;

    if (isInVerticalZone && isInHorizontalZone) {
        showNav();
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(hideNav, NAV_HIDE_INACTIVITY_MS);
    } else {
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(hideNav, NAV_HIDE_LEAVE_MS);
    }
}

function showNav(): void {
    if (navContainerElement && UIState.update("isNavVisible", true)) {
        toggleClass(navContainerElement, "opacity-100 translate-y-0", true);
        toggleClass(navContainerElement, "opacity-0 translate-y-[-150%]", false);
    }
    clearTimeout(navHideTimeout);
}

function hideNav(): void {
    if (navContainerElement && UIState.update("isNavVisible", false)) {
        toggleClass(navContainerElement, "opacity-100 translate-y-0", false);
        toggleClass(navContainerElement, "opacity-0 translate-y-[-150%]", true);
    }
}

export function setNavBarEnabled(enabled: boolean): void {
    navBarEnabled = enabled;
    setVisible(navContainerElement, enabled);
    if (!enabled) {
        hideNav();
    }
}
