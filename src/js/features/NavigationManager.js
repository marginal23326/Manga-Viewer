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
export function updateFullscreenIcon(isFullscreen) {
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
    button.appendChild(icon);
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

    navContainerElement.appendChild(firstBtn);
    navContainerElement.appendChild(centerGroup);
    navContainerElement.appendChild(lastBtn);
    navContainerElement.appendChild(separator);
    navContainerElement.appendChild(fullscreenBtn);

    updateFullscreenIcon(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("mousemove", handleNavMouseMove);
}

function handleFullscreenChange() {
    updateFullscreenIcon(!!document.fullscreenElement);
}

// Simple mouse move handler for nav visibility
let navHideTimeout = null;
function handleNavMouseMove(event) {
    if (PersistState.currentView !== "viewer" || LightboxState.isOpen || !navBarEnabled) {
        hideNav();
        return;
    }

    const navHeight = navContainerElement?.offsetHeight || 80;
    const triggerZone = navHeight * 1.5; // Area at the top to trigger visibility
    const bufferZonePercent = 0.2; // 20% margin on left/right
    const bufferZonePixels = window.innerWidth * bufferZonePercent;

    const isInVerticalZone = event.clientY < triggerZone;
    const isInHorizontalZone = event.clientX > bufferZonePixels && event.clientX < window.innerWidth - bufferZonePixels;

    if (isInVerticalZone && isInHorizontalZone) {
        showNav();
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(hideNav, 3000); // Hide after 3 seconds of inactivity
    } else {
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(hideNav, 30); // Hide quickly
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
