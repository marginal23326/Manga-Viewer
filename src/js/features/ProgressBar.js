import { DOM, addClass, removeClass, toggleClass, h } from "../core/DOMUtils";

import { scrollToImage } from "./ImageManager";
import { getCurrentManga } from "./MangaManager";
import { loadMangaSettings } from "./SettingsManager";
import { getVisibleImageIndex } from "./ScrubberManager";

let currentSettings = {};
let totalPages = 0;
let pageElements = [];
let progressBarElement = null;

function showPageNumberIndicator(segment, index, isTop) {
    const pageNumber = h(
        "span",
        {
            className:
                "fixed z-50 w-8 h-8 bg-[#FF3366] brutal-border text-white font-space font-bold text-xs flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-150 ease-in-out brutal-shadow page-indicator",
        },
        `${index + 1}`,
    );

    const rect = segment.getBoundingClientRect();
    pageNumber.style.left = `${rect.left + rect.width / 2}px`;
    pageNumber.style.transform = "translateX(-50%)";

    if (isTop) {
        pageNumber.style.top = `${rect.bottom + 12}px`;
    } else {
        pageNumber.style.bottom = `${window.innerHeight - rect.top + 12}px`;
    }

    pageNumber.style.opacity = "0";
    DOM.viewerContainer.appendChild(pageNumber);

    void pageNumber.offsetWidth;
    pageNumber.style.opacity = "1";
}

function hidePageNumberIndicators() {
    const indicators = DOM.viewerContainer.querySelectorAll(`.page-indicator`);
    indicators.forEach((indicator) => {
        indicator.style.opacity = "0";
        setTimeout(() => {
            if (indicator.parentNode) {
                DOM.viewerContainer.removeChild(indicator);
            }
        }, 100);
    });
}

function createSegment(index, isTop) {
    const segment = h("div", {
        className:
            "flex-1 bg-black/50 dark:bg-black/80 hover:bg-[#CC2450] dark:hover:bg-[#CC2450] cursor-pointer border-r border-black/30 dark:border-white/20 last:border-r-0 relative",
        "data-page-index": index,
    });

    let hoverTimer = null;

    const showIndicator = () => {
        hidePageNumberIndicators();
        showPageNumberIndicator(segment, index, isTop);
    };

    segment.addEventListener("mouseenter", () => {
        clearTimeout(hoverTimer);

        if (DOM.viewerContainer.querySelector(".page-indicator")) {
            showIndicator();
        } else {
            hoverTimer = setTimeout(showIndicator, 150);
        }
    });

    segment.addEventListener("mouseleave", () => {
        clearTimeout(hoverTimer);
        hidePageNumberIndicators();
    });

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
        progressBarElement = h("div", {
            id: "scroll-progress-bar",
            className: `h-1.5 bg-[#FF3366] transition-width duration-100 ease-linear ${hoverScaleClasses}`,
        });
        progressBarElement.style.width = "0%";
    } else if (currentSettings.progressBarStyle === "discrete") {
        progressBarElement = h("div", {
            id: "scroll-progress-bar",
            className: `flex h-2.5 ${hoverScaleClasses}`,
        });

        for (let i = 0; i < totalPages; i++) {
            const segment = createSegment(i, isTop);
            progressBarElement.appendChild(segment);
        }
        progressBarElement.addEventListener("click", handleBarClick);
    }

    if (progressBarElement) {
        DOM.progressBar.appendChild(progressBarElement);
    }

    removeClass(DOM.progressBar, "top-0 bottom-0 origin-top origin-bottom pt-2 pb-2");
    addClass(DOM.progressBar, isTop ? "top-0 origin-top" : "bottom-0 origin-bottom");
}

function updateProgressBar() {
    const manga = getCurrentManga();
    if (!currentSettings.progressBarEnabled || !progressBarElement || !manga) return;

    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;
    const scrollPercentage = scrollableHeight > 0 ? (currentScroll / scrollableHeight) * 100 : 0;

    if (currentSettings.progressBarStyle === "continuous") {
        progressBarElement.style.width = `${scrollPercentage}%`;
    } else if (currentSettings.progressBarStyle === "discrete") {
        const currentPageIndex = getVisibleImageIndex();
        const segments = Array.from(progressBarElement.children);

        segments.forEach((segment, i) => {
            const shouldBeFilled = i <= currentPageIndex;
            toggleClass(segment, "bg-[#FF3366]", shouldBeFilled);
            toggleClass(segment, "bg-black/50 dark:bg-black/80", !shouldBeFilled);
        });
    }
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
        const indicators = DOM.viewerContainer.querySelectorAll(`.page-indicator`);
        indicators.forEach((indicator) => {
            if (indicator.parentNode) DOM.viewerContainer.removeChild(indicator);
        });

        // Recreate progress bar
        createProgressBarElement();
        updateProgressBar();
    }
}

export function updatePageData() {
    const manga = getCurrentManga();
    if (!manga) {
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
    const manga = getCurrentManga();
    if (!manga) return;
    currentSettings = loadMangaSettings(manga.id);
    if (!progressBarElement || currentSettings.progressBarStyle === "continuous") {
        createProgressBarElement();
    }
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
