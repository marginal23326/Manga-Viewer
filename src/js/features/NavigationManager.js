import { AppState } from "../core/AppState";
import { DOM, $, setAttribute, setText, addClass, toggleClass } from "../core/DOMUtils";
import { goToFirstChapter, loadPreviousChapter, loadNextChapter, goToLastChapter } from "./ImageManager";
import { toggleFullScreen } from "../ui/ViewerUI";
import { createElement, Minimize, Maximize } from "lucide";

let navContainerElement = null;
let imageRangeElement = null;

// Function to create a navigation button
function createNavButton(id, iconName, tooltip, clickHandler) {
    const button = document.createElement("button");
    addClass(button, "btn-icon text-white hover:bg-white/20 focus:ring-white/50");
    if (id) button.id = id;
    setAttribute(button, "title", tooltip);

    const icon = document.createElement("i"); // Use placeholder <i>
    setAttribute(icon, "data-lucide", iconName);
    setAttribute(icon, "width", "20");
    setAttribute(icon, "height", "20");
    setAttribute(icon, "stroke-width", "2.5");

    button.appendChild(icon);
    button.addEventListener("click", (event) => {
        clickHandler();
        event.currentTarget.blur();
    });
    return button;
}

// Update the text showing the current image range
export function updateImageRangeDisplay(start, end, total) {
    if (imageRangeElement) {
        if (total > 0) {
            setText(imageRangeElement, `${start} - ${end} / ${total}`);
        } else {
            setText(imageRangeElement, "0 / 0");
        }
    }
}

// Update the fullscreen button icon based on fullscreen state
export function updateFullscreenIcon(isFullscreen) {
    const button = $("#fullscreen-button", navContainerElement);
    if (!button) return;

    const icon = createElement(isFullscreen ? Minimize : Maximize, {
        width: "20",
        height: "20",
        "stroke-width": "2.5",
    });

    const tooltip = `${isFullscreen ? "Exit" : "Enter"} Fullscreen (f)`;

    button.innerHTML = "";
    button.appendChild(icon);
    setAttribute(button, "title", tooltip);
}

export function initNavigation() {
    navContainerElement = DOM.navContainer;
    if (!navContainerElement) return;
    navContainerElement.innerHTML = "";

    // Create Buttons
    const firstBtn = createNavButton("first-button", "chevrons-left", "First Chapter (h)", goToFirstChapter);
    const prevBtn = createNavButton("prev-button", "chevron-left", "Previous Chapter (Alt+Left)", loadPreviousChapter);
    const nextBtn = createNavButton("next-button", "chevron-right", "Next Chapter (Alt+Right)", loadNextChapter);
    const lastBtn = createNavButton("last-button", "chevrons-right", "Last Chapter (l)", goToLastChapter);
    const fullscreenBtn = createNavButton("fullscreen-button", "maximize", "Toggle Fullscreen (f)", toggleFullScreen);

    // Create Image Range Display
    imageRangeElement = document.createElement("span");
    addClass(imageRangeElement, "text-sm text-white font-medium px-2 whitespace-nowrap");
    updateImageRangeDisplay(0, 0, 0);

    // Append elements
    navContainerElement.appendChild(firstBtn);
    navContainerElement.appendChild(prevBtn);
    navContainerElement.appendChild(imageRangeElement);
    navContainerElement.appendChild(nextBtn);
    navContainerElement.appendChild(lastBtn);
    navContainerElement.appendChild(fullscreenBtn);

    // Add mouse move listener to show/hide nav (can be refined)
    // Consider debouncing or using CSS transitions triggered by JS
    document.addEventListener("mousemove", handleNavMouseMove);
}

// Simple mouse move handler for nav visibility
let navHideTimeout = null;
function handleNavMouseMove(event) {
    if (AppState.currentView !== "viewer") {
        hideNav(); // Ensure nav is hidden if not in viewer
        return;
    }

    const navHeight = navContainerElement?.offsetHeight || 70;
    const triggerZone = navHeight * 1.5; // Area at the top to trigger visibility
    const bufferZonePercent = 0.2; // 20% margin on left/right
    const bufferZonePixels = window.innerWidth * bufferZonePercent;

    const isInVerticalZone = event.clientY < triggerZone;
    const isInHorizontalZone = event.clientX > bufferZonePixels && event.clientX < window.innerWidth - bufferZonePixels;

    // TODO: Check if scrubber is active/hovered - requires ScrubberManager state
    // const isScrubberActive = ScrubberManager.isActive(); // Need to implement this

    if (isInVerticalZone && isInHorizontalZone /* && !isScrubberActive */) {
        showNav();
        // Optional: Auto-hide after a delay if mouse stops moving within the zone
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(hideNav, 3000); // Hide after 3 seconds of inactivity
    } else {
        // If mouse moves out of the zone, start hide timer immediately
        clearTimeout(navHideTimeout);
        navHideTimeout = setTimeout(hideNav, 30); // Hide quickly
    }
}

function showNav() {
    if (navContainerElement && !AppState.isNavVisible) {
        AppState.update("isNavVisible", true, false); // Update state without saving
        toggleClass(navContainerElement, "opacity-100 translate-y-0", true);
        toggleClass(navContainerElement, "opacity-0 -translate-y-full", false);
    }
    // Clear hide timer if show is triggered again
    clearTimeout(navHideTimeout);
}

export function hideNav() {
    if (navContainerElement && AppState.isNavVisible) {
        AppState.update("isNavVisible", false, false); // Update state without saving
        toggleClass(navContainerElement, "opacity-100 translate-y-0", false);
        toggleClass(navContainerElement, "opacity-0 -translate-y-full", true);
    }
}
