import { $, DOM, addClass, h, setAttribute, toggleClass } from "../core/dom-utils";
import { LightboxState, PersistState, UIState } from "../state/state";
import { createIconButton, iconSvg } from "../core/icons";
import { goToFirstChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./image-manager";
import { AppEvents } from "../core/app-events";
import { toggleFullScreen } from "../core/fullscreen";
import { updateImageRangeDisplay } from "../viewer/status-display";

let navContainerElement = null;
let navBarEnabled = true;

// Function to create a brutalist navigation button
function createNavButton(id, iconName, tooltip, clickHandler) {
    return createIconButton(iconName, {
        className:
            "btn-icon-accent p-2 bg-paper dark:bg-ink hover:-translate-y-0.5 hover:-translate-x-0.5 hover:brutal-shadow-accent",
        id,
        onClick: clickHandler,
        tooltip,
    });
}

// Update the fullscreen button icon based on fullscreen state
function updateFullscreenIcon(isFullscreen) {
    const button = $("#fullscreen-button", navContainerElement);
    if (!button) return;

    // Thicker stroke for brutalist aesthetic
    const icon = iconSvg(isFullscreen ? "Minimize" : "Maximize");

    const tooltip = `${isFullscreen ? "EXIT" : "ENTER"} FULLSCREEN (f)`;

    button.innerHTML = "";
    button.append(icon);
    setAttribute(button, { title: tooltip });
}

export function initNavigation() {
    navContainerElement = DOM.navContainer;
    if (!navContainerElement) return;
    navContainerElement.innerHTML = "";

    const firstBtn = createNavButton("first-button", "chevrons-left", "FIRST CHAPTER (h)", goToFirstChapter);
    const prevBtn = createNavButton("prev-button", "chevron-left", "PREV CHAPTER (Alt+Left)", loadPreviousChapter);
    const nextBtn = createNavButton("next-button", "chevron-right", "NEXT CHAPTER (Alt+Right)", loadNextChapter);
    const lastBtn = createNavButton("last-button", "chevrons-right", "LAST CHAPTER (l)", goToLastChapter);
    const fullscreenBtn = createNavButton("fullscreen-button", "maximize", "TOGGLE FULLSCREEN (f)", toggleFullScreen);

    const imageRangeElement = h("div", {
        className:
            "font-space font-bold uppercase tracking-widest text-sm text-[#FF3366] bg-black dark:bg-white px-4 py-2 brutal-border shadow-[inset_0_0_0_2px_rgba(255,51,102,0.2)] dark:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.1)] flex items-center justify-center min-w-[140px] whitespace-nowrap",
        id: "image-range-display",
    });
    updateImageRangeDisplay(0, 0, 0);

    const centerGroup = h(
        "div",
        { className: "flex items-center space-x-2 px-2" },
        prevBtn,
        imageRangeElement,
        nextBtn,
    );

    const separator = h("div", { className: "w-1 h-8 bg-black/20 dark:bg-white/20 mx-2" });

    navContainerElement.append(firstBtn);
    navContainerElement.append(centerGroup);
    navContainerElement.append(lastBtn);
    navContainerElement.append(separator);
    navContainerElement.append(fullscreenBtn);

    updateFullscreenIcon(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("mousemove", handleNavMouseMove);
    AppEvents.addEventListener("navHideRequested", hideNav);
}

function handleFullscreenChange() {
    updateFullscreenIcon(Boolean(document.fullscreenElement));
}

// Simple mouse move handler for nav visibility
let navHideTimeout = null;
const NAV_HIDE_INACTIVITY_MS = 3000;
const NAV_HIDE_LEAVE_MS = 30;
function handleNavMouseMove(event) {
    if (PersistState.currentView !== "viewer" || LightboxState.isOpen || !navBarEnabled) {
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

function showNav() {
    if (navContainerElement && !UIState.isNavVisible) {
        UIState.update("isNavVisible", true);
        // Note: Using -translate-y-[150%] to match the index.html setup
        toggleClass(navContainerElement, "opacity-100 translate-y-0", true);
        toggleClass(navContainerElement, "opacity-0 -translate-y-[150%]", false);
    }
    clearTimeout(navHideTimeout);
}

function hideNav() {
    if (!navContainerElement || !UIState.isNavVisible) return;

    UIState.update("isNavVisible", false);
    toggleClass(navContainerElement, "opacity-100 translate-y-0", false);
    toggleClass(navContainerElement, "opacity-0 -translate-y-[150%]", true);
}

export function setNavBarEnabled(enabled) {
    navBarEnabled = enabled;
    if (!enabled) {
        hideNav();
        if (navContainerElement) {
            addClass(navContainerElement, "hidden");
        }
    } else if (navContainerElement) {
        navContainerElement.classList.remove("hidden");
    }
}
