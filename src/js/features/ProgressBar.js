import { DOM, addClass, removeClass, toggleClass, setAttribute, setText } from "../core/DOMUtils";
import { State } from "../core/State";

import { scrollToImage } from "./ImageManager";
import { loadMangaSettings } from "./SettingsManager";


let currentSettings = {};
let totalPages = 0;
let pageElements = [];
let progressBarElement = null;

function showPageNumberIndicator(segment, index, isTop) {
    const pageNumber = document.createElement("span");
    addClass(pageNumber, "fixed z-20 w-6 h-6 bg-blue-500 rounded-lg text-white text-xs flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-150 ease-in-out");
    pageNumber.setAttribute("data-page-indicator", "true");

    const rect = segment.getBoundingClientRect();
    pageNumber.style.left = `${rect.left + rect.width / 2}px`;
    pageNumber.style.transform = "translateX(-50%)";

    if (isTop) {
        pageNumber.style.top = `${rect.bottom + 6}px`;
    } else {
        pageNumber.style.bottom = `${window.innerHeight - rect.top + 6}px`;
    }

    setText(pageNumber, `${index + 1}`);
    pageNumber.style.opacity = "0";
    DOM.viewerContainer.appendChild(pageNumber); 

    // Trigger reflow and fade in
    void pageNumber.offsetWidth;
    pageNumber.style.opacity = "1";
}

function hidePageNumberIndicators() {
    const indicators = DOM.viewerContainer.querySelectorAll(`[data-page-indicator='true']`);
    indicators.forEach(indicator => {
        indicator.style.opacity = "0";
        setTimeout(() => {
            if (indicator.parentNode) {
                DOM.viewerContainer.removeChild(indicator);
            }
        }, 150);
    });
}

function createSegment(index, isTop) {
    const segment = document.createElement("div");
    addClass(segment, `flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-blue-400 cursor-pointer border-r border-gray-100 dark:border-gray-700 last:border-r-0`, "relative");
    setAttribute(segment, { "data-page-index": index });

    segment.addEventListener("mouseenter", () => showPageNumberIndicator(segment, index, isTop));
    segment.addEventListener("mouseleave", hidePageNumberIndicators);

    return segment;
}

function createProgressBarElement() {
    if (!DOM.progressBar) return;
    DOM.progressBar.innerHTML = "";
    progressBarElement = null;

    if (!currentSettings.progressBarEnabled) return;

    const isTop = currentSettings.progressBarPosition === "top";
    const hoverScaleClasses = `group-hover:scale-y-300 transition-transform duration-150 ease-in-out ${isTop ? "origin-top" : "origin-bottom"}`;

    if (currentSettings.progressBarStyle === "continuous") {
        progressBarElement = document.createElement("div");
        progressBarElement.id = "scroll-progress-bar";
        addClass(progressBarElement, `h-1 bg-blue-500 transition-width duration-100 ease-linear ${hoverScaleClasses}`);
        progressBarElement.style.width = "0%";
    } else if (currentSettings.progressBarStyle === "discrete") {
        progressBarElement = document.createElement("div");
        progressBarElement.id = "scroll-progress-bar";
        addClass(progressBarElement, `flex h-2 ${hoverScaleClasses}`);

        // Create segments using helper
        for (let i = 0; i < totalPages; i++) {
            const segment = createSegment(i, isTop);
            progressBarElement.appendChild(segment);
        }
        progressBarElement.addEventListener("click", handleBarClick);
    }

    if (progressBarElement) {
        DOM.progressBar.appendChild(progressBarElement);
    }

    // Apply position classes
    removeClass(DOM.progressBar, "top-0 bottom-0 origin-top origin-bottom pt-2 pb-2");
    addClass(DOM.progressBar, isTop ? "top-0 origin-top" : "bottom-0 origin-bottom");
}

function updateProgressBar() {
    if (!currentSettings.progressBarEnabled || !progressBarElement || !State.currentManga) return;

    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;
    const scrollPercentage = scrollableHeight > 0 ? (currentScroll / scrollableHeight) * 100 : 0;

    if (currentSettings.progressBarStyle === "continuous") {
        progressBarElement.style.width = `${scrollPercentage}%`;
    } else if (currentSettings.progressBarStyle === "discrete") {
        const currentPageIndex = getCurrentPageIndex();
        const segments = Array.from(progressBarElement.children);
        
        segments.forEach((segment, i) => {
            const shouldBeFilled = i <= currentPageIndex;
            toggleClass(segment, "bg-blue-500 dark:bg-blue-700", shouldBeFilled);
            toggleClass(segment, "bg-gray-300 dark:bg-gray-600", !shouldBeFilled);
        });
    }
}

function getCurrentPageIndex() {
    if (!pageElements || pageElements.length === 0) return 0;

    const viewportCenter = window.scrollY + window.innerHeight / 2;
    let closestPageIndex = 0;
    let minDistance = Infinity;

    pageElements.forEach((img, index) => {
        const imgRect = img.getBoundingClientRect();
        const imgCenter = window.scrollY + imgRect.top + imgRect.height / 2;
        const distance = Math.abs(viewportCenter - imgCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestPageIndex = index;
        }
    });
    return closestPageIndex;
}

function handleBarClick(event) {
    const segment = event.target.closest("[data-page-index]");
    if (segment) {
        const pageIndex = parseInt(segment.dataset.pageIndex, 10);
        if (!isNaN(pageIndex) && pageIndex >= 0 && pageIndex < pageElements.length) {
            scrollToImage(pageIndex);
        }
    }
}

export function applyProgressBarSettings(newSettings = {}) {
    const settingsChanged = 
        currentSettings.progressBarEnabled !== newSettings.progressBarEnabled ||
        currentSettings.progressBarStyle !== newSettings.progressBarStyle ||
        currentSettings.progressBarPosition !== newSettings.progressBarPosition;
    
    // Update settings
    currentSettings = { ...currentSettings, ...newSettings };
    
    if (settingsChanged) {
        // Clear any page indicators
        const indicators = DOM.viewerContainer.querySelectorAll(`[data-page-indicator='true']`);
        indicators.forEach(indicator => {
            if (indicator.parentNode) DOM.viewerContainer.removeChild(indicator);
        });
        
        // Recreate progress bar
        createProgressBarElement();
        updateProgressBar();
    }
}

export function updatePageData() {
    if (!State.currentManga) {
        totalPages = 0;
        pageElements = [];
        return;
    }
    
    pageElements = Array.from(DOM.imageContainer?.querySelectorAll("img.manga-image") || []);
    totalPages = pageElements.length;

    if (currentSettings.progressBarStyle === "discrete") {
        createProgressBarElement();
    }
    updateProgressBar();
}

export function initProgressBar() {
    if (!State.currentManga) return;
    currentSettings = loadMangaSettings(State.currentManga.id);
    updatePageData();
    createProgressBarElement();
    window.addEventListener("scroll", updateProgressBar);
    window.addEventListener("resize", updateProgressBar);
}

export function destroyProgressBar() {
    window.removeEventListener("scroll", updateProgressBar);
    window.removeEventListener("resize", updateProgressBar);
    
    if (progressBarElement && currentSettings.progressBarStyle === "discrete") {
        progressBarElement.removeEventListener("click", handleBarClick);
    }
    if (DOM.progressBar) {
        DOM.progressBar.innerHTML = "";
        removeClass(DOM.progressBar, "top-0 bottom-0 origin-top origin-bottom pt-2 pb-2");
    }
    progressBarElement = null;
    pageElements = [];
    totalPages = 0;
}
