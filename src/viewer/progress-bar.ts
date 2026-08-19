import { DEFAULT_MANGA_SETTINGS, getCurrentManga, getSettings } from "@/state";
import { DOM, addClass, h, removeClass, toggleClass } from "@/core/dom-utils";
import { debounce, getMangaImages, toInt } from "@/core/utils";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import type { ResolvedMangaSettings } from "@/types";
import { createState } from "@/core/create-state";
import { getVisibleImageIndex } from "./current-page";
import { scrollToImage } from "@/viewer/scroll-position";

const PROGRESS_BAR_SETTING_KEYS = ["progressBarEnabled", "progressBarPosition", "progressBarStyle"] as const;

type ProgressBarSettings = Required<Pick<ResolvedMangaSettings, (typeof PROGRESS_BAR_SETTING_KEYS)[number]>>;

const currentSettings = createState<ResolvedMangaSettings>(DEFAULT_MANGA_SETTINGS);

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
                "fixed z-50 min-w-7 h-7 px-1.5 rounded-full bg-accent dark:bg-accent-light text-white font-mono font-medium text-[11px] flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-150 ease-out shadow-soft",
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
            "flex-1 bg-ink/15 dark:bg-paper/15 hover:bg-accent dark:hover:bg-accent-light cursor-pointer border-r border-paper dark:border-ink last:border-r-0 relative",
        dataset: { pageIndex: String(index) },
    });
}

function createProgressBarElement(): void {
    if (!DOM.progressBar) return;
    const progressBarContainer = DOM.progressBar;
    progressBarElement = null;
    clearTimeout(hoverTimer);
    hoveredSegmentIndex = null;

    if (!currentSettings.progressBarEnabled) {
        progressBarContainer.replaceChildren();
        return;
    }

    const isTop = currentSettings.progressBarPosition === "top";
    const anchorClass = isTop ? "top-0" : "bottom-0";

    if (currentSettings.progressBarStyle === "continuous") {
        progressBarElement = h("div", {
            className: `absolute left-0 right-0 h-1 bg-accent dark:bg-accent-light transition-[width,height] duration-100 ease-linear group-hover:h-[12px] ${anchorClass}`,
            id: "scroll-progress-bar",
        });
        progressBarElement.style.width = "0%";
    } else if (currentSettings.progressBarStyle === "discrete") {
        const edgeBorderClass = isTop ? "dark:border-b-ink" : "dark:border-t-ink";
        progressBarElement = h("div", {
            className: `absolute left-0 right-0 flex h-2.5 border-y divider-line ${edgeBorderClass} group-hover:h-[30px] transition-[height] duration-150 ease-in-out ${anchorClass}`,
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
        progressBarContainer.replaceChildren(progressBarElement);
    }

    removeClass(progressBarContainer, "top-0 bottom-0 pt-2 pb-2");
    addClass(progressBarContainer, isTop ? "top-0" : "bottom-0");
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
        const currentPageIndex = Math.max(
            0,
            pageElements.findIndex((img) => toInt(img.dataset.index) === getVisibleImageIndex()),
        );
        const segments = [...bar.children];

        segments.forEach((segment, i) => {
            const shouldBeFilled = i <= currentPageIndex;
            toggleClass(segment, "bg-accent dark:bg-accent-light", shouldBeFilled);
            toggleClass(segment, "bg-ink/15 dark:bg-paper/15", !shouldBeFilled);
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

function rebuildProgressBar(): void {
    destroyTooltip();
    createProgressBarElement();
    updateProgressBar();
}

PROGRESS_BAR_SETTING_KEYS.forEach((key) => currentSettings.onChange(key, rebuildProgressBar));

export function applyProgressBarSettings(newSettings: ProgressBarSettings): void {
    PROGRESS_BAR_SETTING_KEYS.forEach((key) => currentSettings.update(key, newSettings[key]));
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

    currentSettings.hydrate(getSettings(manga.id));
    if (!progressBarElement || currentSettings.progressBarStyle === "continuous") {
        createProgressBarElement();
    }
    onAppEvent("viewerScroll", debouncedUpdateProgressBar);
    window.addEventListener("resize", debouncedUpdateProgressBar);
    onAppEvent("visibleImageChanged", updateProgressBar);
}

export function destroyProgressBar(): void {
    offAppEvent("viewerScroll", debouncedUpdateProgressBar);
    window.removeEventListener("resize", debouncedUpdateProgressBar);
    offAppEvent("visibleImageChanged", updateProgressBar);

    if (progressBarElement && currentSettings.progressBarStyle === "discrete") {
        progressBarElement.removeEventListener("click", handleBarClick);
        progressBarElement.removeEventListener("mousemove", handleBarMouseMove);
        progressBarElement.removeEventListener("mouseleave", handleBarMouseLeave);
    }
    if (DOM.progressBar) {
        DOM.progressBar.replaceChildren();
        removeClass(DOM.progressBar, "top-0 bottom-0 pt-2 pb-2");
    }
    progressBarElement = null;
    pageElements = [];
    totalPages = 0;
    destroyTooltip();
}
