import { createElement, Minimize, Maximize } from "lucide";

import { DOM, $, setAttribute, addClass, toggleClass, h } from "../core/DOMUtils";
import { hideNav } from "../core/NavVisibility";
import { toggleFullScreen } from "../core/Fullscreen";
import { updateImageRangeDisplay } from "../core/ImageRangeDisplay";
import { PersistState, LightboxState, UIState } from "../core/State";

import { goToFirstChapter, loadPreviousChapter, loadNextChapter, goToLastChapter } from "./ImageManager";

let navContainerElement = null;
let navBarEnabled = true;

// Function to create a brutalist navigation button
function createNavButton(id, iconName, tooltip, clickHandler) {
    const icon = h("i", { "data-lucide": iconName, width: "24", height: "24", "stroke-width": "3" });

    const button = h(
        "button",
        {
            id,
            title: tooltip,
            className:
                "flex items-center justify-center p-2 bg-paper dark:bg-ink text-black dark:text-white brutal-border brutal-transition cursor-pointer hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[4px_4px_0_0_#FF3366] hover:bg-[#FF3366] hover:!text-white hover:border-[#FF3366] active:translate-y-0 active:translate-x-0 active:shadow-none focus:outline-none focus:ring-0 rounded-none",
        },
        icon,
    );

    button.addEventListener("click", (event) => {
        clickHandler();
        event.currentTarget.blur();
    });
    return button;
}

// Update the fullscreen button icon based on fullscreen state
function updateFullscreenIcon(isFullscreen) {
    const button = $("#fullscreen-button", navContainerElement);
    if (!button) return;

    // Use thicker stroke for brutalist aesthetic
    const icon = createElement(isFullscreen ? Minimize : Maximize, {
        width: "24",
        height: "24",
        "stroke-width": "3",
    });

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
        id: "image-range-display",
        className:
            "font-space font-bold uppercase tracking-widest text-sm text-[#FF3366] bg-black dark:bg-white px-4 py-2 brutal-border shadow-[inset_0_0_0_2px_rgba(255,51,102,0.2)] dark:shadow-[inset_0_0_0_2px_rgba(0,0,0,0.1)] flex items-center justify-center min-w-[140px] whitespace-nowrap",
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

    updateFullscreenIcon(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("mousemove", handleNavMouseMove);
}

function handleFullscreenChange() {
    updateFullscreenIcon(!!document.fullscreenElement);
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
