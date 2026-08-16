import { DOM, addClass, h, removeClass, toggleClass } from "@/core/dom-utils";
import { debounce, getMangaImages, toInt } from "@/core/utils";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import type { StoredMangaSettings } from "@/types";
import { getCurrentManga } from "@/state/manga-library";
import { getSettings } from "@/state/manga-settings";
import { getVisibleImageIndex } from "./scrubber";
import { scrollToImage } from "@/viewer/scroll-position";

let currentSettings: StoredMangaSettings = {};
let totalPages = 0;
let pageElements: HTMLImageElement[] = [];
let progressBarElement: HTMLDivElement | null = null;
let hoveredSegmentIndex: number | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | undefined;

let tooltipElement: HTMLSpanElement | null = null;
let tooltipVisible = false;

function showPageNumberIndicator(segment: HTMLElement, index: number): void {
    if (!DOM.viewerContainer) return;
    if (!tooltipElement) {
        tooltipElement = h("span", {
            className:
                "fixed z-50 w-8 h-8 bg-accent brutal-border text-white font-space font-bold text-xs flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-150 ease-in-out brutal-shadow",
        });
        tooltipElement.style.transform = "translateX(-50%)";
        DOM.viewerContainer.append(tooltipElement);
    }
    const tooltip = tooltipElement;

    tooltip.textContent = `${index + 1}`;

    const rect = segment.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    if (currentSettings.progressBarPosition === "top") {
        tooltip.style.top = `${rect.bottom + 12}px`;
        tooltip.style.bottom = "";
    } else {
        tooltip.style.bottom = `${window.innerHeight - rect.top + 12}px`;
        tooltip.style.top = "";
    }

    if (tooltipVisible) return;
    tooltipVisible = true;

    void tooltip.offsetWidth;
    tooltip.style.opacity = "1";
}

function destroyTooltip(): void {
    clearTimeout(hoverTimer);
    hoveredSegmentIndex = null;
    tooltipVisible = false;
    tooltipElement?.remove();
    tooltipElement = null;
}

function createSegment(index: number): HTMLDivElement {
    return h("div", {
        className:
            "flex-1 bg-black/50 dark:bg-black/80 hover:bg-[#CC2450] dark:hover:bg-[#CC2450] cursor-pointer border-r border-black/30 dark:border-white/20 last:border-r-0 relative",
        dataset: { pageIndex: String(index) },
    });
}

function createProgressBarElement(): void {
    if (!DOM.progressBar) return;
    const progressBarContainer = DOM.progressBar;
    progressBarContainer.innerHTML = "";
    progressBarElement = null;
    clearTimeout(hoverTimer);
    hoveredSegmentIndex = null;

    if (!currentSettings.progressBarEnabled) return;

    const isTop = currentSettings.progressBarPosition === "top";
    const hoverScaleClasses = `group-hover:scale-y-300 transition-transform duration-150 ease-in-out ${isTop ? "origin-top" : "origin-bottom"}`;

    if (currentSettings.progressBarStyle === "continuous") {
        progressBarElement = h("div", {
            className: `h-1.5 bg-accent transition-width duration-100 ease-linear ${hoverScaleClasses}`,
            id: "scroll-progress-bar",
        });
        progressBarElement.style.width = "0%";
    } else if (currentSettings.progressBarStyle === "discrete") {
        progressBarElement = h("div", {
            className: `flex h-2.5 ${hoverScaleClasses}`,
            id: "scroll-progress-bar",
        });

        for (let i = 0; i < totalPages; i++) {
            progressBarElement.append(createSegment(i));
        }
        progressBarElement.addEventListener("click", handleBarClick);
        progressBarElement.addEventListener("mousemove", handleBarMouseMove);
        progressBarElement.addEventListener("mouseleave", handleBarMouseLeave);
    }

    if (progressBarElement) {
        progressBarContainer.append(progressBarElement);
    }

    removeClass(progressBarContainer, "top-0 bottom-0 origin-top origin-bottom pt-2 pb-2");
    addClass(progressBarContainer, isTop ? "top-0 origin-top" : "bottom-0 origin-bottom");
}

function updateProgressBar(): void {
    if (!currentSettings.progressBarEnabled || !progressBarElement || !getCurrentManga()) return;
    const bar = progressBarElement;

    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;
    const scrollPercentage = scrollableHeight > 0 ? (currentScroll / scrollableHeight) * 100 : 0;

    if (currentSettings.progressBarStyle === "continuous") {
        bar.style.width = `${scrollPercentage}%`;
    } else if (currentSettings.progressBarStyle === "discrete") {
        const currentPageIndex = getVisibleImageIndex();
        const segments = [...bar.children];

        segments.forEach((segment, i) => {
            const shouldBeFilled = i <= currentPageIndex;
            toggleClass(segment, "bg-accent", shouldBeFilled);
            toggleClass(segment, "bg-black/50 dark:bg-black/80", !shouldBeFilled);
        });
    }
}

function getSegmentFromEvent(event: MouseEvent): { index: number; segment: HTMLElement } | null {
    const segment = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-page-index]");
    if (!segment) return null;
    const index = toInt(segment.dataset.pageIndex);
    return Number.isNaN(index) ? null : { index, segment };
}

function handleBarClick(event: MouseEvent): void {
    const hit = getSegmentFromEvent(event);
    if (hit && hit.index >= 0 && hit.index < pageElements.length) {
        scrollToImage(hit.index);
    }
}

function handleBarMouseMove(event: MouseEvent): void {
    const hit = getSegmentFromEvent(event);
    if (!hit || hit.index === hoveredSegmentIndex) return;
    hoveredSegmentIndex = hit.index;

    clearTimeout(hoverTimer);
    if (tooltipVisible) {
        showPageNumberIndicator(hit.segment, hit.index);
    } else {
        hoverTimer = setTimeout(() => showPageNumberIndicator(hit.segment, hit.index), 150);
    }
}

function handleBarMouseLeave(): void {
    clearTimeout(hoverTimer);
    hoveredSegmentIndex = null;
    if (!tooltipVisible) return;
    tooltipVisible = false;
    if (tooltipElement) tooltipElement.style.opacity = "0";
}

const debouncedUpdateProgressBar = debounce(updateProgressBar);

export function applyProgressBarSettings(newSettings: Partial<StoredMangaSettings> = {}): void {
    const settingsChanged =
        currentSettings.progressBarEnabled !== newSettings.progressBarEnabled ||
        currentSettings.progressBarStyle !== newSettings.progressBarStyle ||
        currentSettings.progressBarPosition !== newSettings.progressBarPosition;

    // Update settings
    currentSettings = { ...currentSettings, ...newSettings };

    if (settingsChanged) {
        // Clear any page indicator
        destroyTooltip();

        // Recreate progress bar
        createProgressBarElement();
        updateProgressBar();
    }
}

export function updatePageData(): void {
    if (!getCurrentManga()) {
        totalPages = 0;
        pageElements = [];
        return;
    }

    pageElements = getMangaImages();
    totalPages = pageElements.length;

    if (currentSettings.progressBarStyle === "discrete") {
        createProgressBarElement();
    }
    updateProgressBar();
}

export function initProgressBar(): void {
    const manga = getCurrentManga();
    if (!manga) return;

    currentSettings = getSettings(manga.id);
    if (!progressBarElement || currentSettings.progressBarStyle === "continuous") {
        createProgressBarElement();
    }
    window.addEventListener("scroll", debouncedUpdateProgressBar);
    window.addEventListener("resize", debouncedUpdateProgressBar);
    onAppEvent("visibleImageChanged", updateProgressBar);
}

export function destroyProgressBar(): void {
    window.removeEventListener("scroll", debouncedUpdateProgressBar);
    window.removeEventListener("resize", debouncedUpdateProgressBar);
    offAppEvent("visibleImageChanged", updateProgressBar);

    if (progressBarElement && currentSettings.progressBarStyle === "discrete") {
        progressBarElement.removeEventListener("click", handleBarClick);
        progressBarElement.removeEventListener("mousemove", handleBarMouseMove);
        progressBarElement.removeEventListener("mouseleave", handleBarMouseLeave);
    }
    if (DOM.progressBar) {
        DOM.progressBar.innerHTML = "";
        removeClass(DOM.progressBar, "top-0 bottom-0 origin-top origin-bottom pt-2 pb-2");
    }
    progressBarElement = null;
    pageElements = [];
    totalPages = 0;
    destroyTooltip();
}
