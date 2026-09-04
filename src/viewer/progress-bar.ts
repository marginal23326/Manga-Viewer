import { CurrentSettings, PersistState, ViewerState, getCurrentManga } from "@/state";
import { DOM, addClass, h, removeClass, toggleClass } from "@/core/dom-utils";
import { clamp, debounce, rafThrottle, renewController } from "@/core/utils";
import type { ChapterContext } from "./chapter";
import Config from "@/core/config";
import { scrollToActiveIndex } from "./virtualizer";

const PROGRESS_BAR_SETTING_KEYS = ["progressBarEnabled", "progressBarPosition", "progressBarStyle"] as const;

let totalPages = 0;
let visibleImageIndex = 0;
let progressBarElement: HTMLDivElement | null = null;
let hoveredSegmentIndex: number | null = null;
let filledSegment = -1;
let barController = new AbortController();
let segmentController = new AbortController();

let tooltipElement: HTMLSpanElement | null = null;
let tooltipVisible = false;

function segmentCount(): number {
    return Math.min(totalPages, Config.PROGRESS_BAR_MAX_SEGMENTS);
}

function pagesPerSegment(): number {
    const count = segmentCount();
    return count > 0 ? totalPages / count : 1;
}

function segmentForPage(pageIndex: number): number {
    const count = segmentCount();
    return count > 0 ? Math.min(count - 1, Math.floor(pageIndex / pagesPerSegment())) : 0;
}

function firstPageOfSegment(segmentIndex: number): number {
    return Math.min(totalPages - 1, Math.round(segmentIndex * pagesPerSegment()));
}

function showPageNumberIndicator(segment: HTMLElement, segmentIndex: number): void {
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

    tooltip.textContent = `${firstPageOfSegment(segmentIndex) + 1}`;

    const rect = segment.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    if (CurrentSettings.progressBarPosition === "top") {
        tooltip.style.top = `${rect.bottom + 12}px`;
        tooltip.style.bottom = "";
    } else {
        tooltip.style.bottom = `${innerHeight - rect.top + 12}px`;
        tooltip.style.top = "";
    }

    if (tooltipVisible) return;
    tooltipVisible = true;

    void tooltip.offsetWidth;
    tooltip.style.opacity = "1";
}

const revealTooltip = debounce(showPageNumberIndicator);

function destroyTooltip(): void {
    revealTooltip.cancel();
    hoveredSegmentIndex = null;
    tooltipVisible = false;
    tooltipElement?.remove();
    tooltipElement = null;
}

function createSegment(): HTMLDivElement {
    return h("div", {
        className:
            "flex-1 bg-ink/15 dark:bg-paper/15 hover:bg-accent dark:hover:bg-accent-light cursor-pointer border-r border-paper dark:border-ink last:border-r-0 relative",
    });
}

function createProgressBarElement(): void {
    if (!DOM.progressBar) return;
    const progressBarContainer = DOM.progressBar;
    progressBarElement = null;
    filledSegment = -1;
    revealTooltip.cancel();
    hoveredSegmentIndex = null;

    if (!CurrentSettings.progressBarEnabled) {
        progressBarContainer.replaceChildren();
        return;
    }

    const isTop = CurrentSettings.progressBarPosition === "top";
    const anchorClass = isTop ? "top-0" : "bottom-0";

    if (CurrentSettings.progressBarStyle === "continuous") {
        progressBarElement = h("div", {
            className: `absolute left-0 right-0 h-1 bg-accent dark:bg-accent-light transition-[width,height] duration-100 ease-linear group-hover:h-[12px] ${anchorClass}`,
            id: "scroll-progress-bar",
        });
        progressBarElement.style.width = "0%";
    } else if (CurrentSettings.progressBarStyle === "discrete") {
        const edgeBorderClass = isTop ? "dark:border-b-ink" : "dark:border-t-ink";
        progressBarElement = h("div", {
            className: `absolute left-0 right-0 flex h-2.5 border-y divider-line ${edgeBorderClass} group-hover:h-[30px] transition-[height] duration-150 ease-in-out ${anchorClass}`,
            id: "scroll-progress-bar",
        });

        for (let i = 0; i < segmentCount(); i++) {
            progressBarElement.append(createSegment());
        }
        segmentController = renewController(segmentController);
        const { signal } = segmentController;
        progressBarElement.addEventListener("click", handleBarClick, { signal });
        progressBarElement.addEventListener("mousemove", handleBarMouseMove, { signal });
        progressBarElement.addEventListener("mouseleave", handleBarMouseLeave, { signal });
    }

    if (progressBarElement) {
        progressBarContainer.replaceChildren(progressBarElement);
    }

    removeClass(progressBarContainer, "top-0 bottom-0 pt-2 pb-2");
    addClass(progressBarContainer, isTop ? "top-0" : "bottom-0");
}

function updateProgressBar(): void {
    if (!CurrentSettings.progressBarEnabled || !progressBarElement || !getCurrentManga()) return;
    const bar = progressBarElement;

    const scrollableHeight = document.documentElement.scrollHeight - innerHeight;
    const currentScroll = scrollY;
    const scrollPercentage = scrollableHeight > 0 ? (currentScroll / scrollableHeight) * 100 : 0;

    if (CurrentSettings.progressBarStyle === "continuous") {
        bar.style.width = `${scrollPercentage}%`;
    } else if (CurrentSettings.progressBarStyle === "discrete") {
        const currentSegment = segmentForPage(visibleImageIndex);
        if (currentSegment === filledSegment) return;

        const [from, to] =
            currentSegment > filledSegment ? [filledSegment + 1, currentSegment] : [currentSegment + 1, filledSegment];
        for (let i = from; i <= to; i++) {
            toggleClass(bar.children[i], "bg-accent dark:bg-accent-light", i <= currentSegment);
            toggleClass(bar.children[i], "bg-ink/15 dark:bg-paper/15", i > currentSegment);
        }
        filledSegment = currentSegment;
    }
}

function getSegmentFromEvent(event: MouseEvent): { index: number; segment: HTMLElement } | null {
    const segment = (event.target as HTMLElement | null)?.closest<HTMLElement>("div");
    if (!segment || segment.parentElement !== progressBarElement) return null;
    const index = progressBarElement ? [...progressBarElement.children].indexOf(segment) : -1;
    if (index < 0) return null;
    return { index, segment };
}

function handleBarClick(event: MouseEvent): void {
    const hit = getSegmentFromEvent(event);
    if (hit) {
        scrollToActiveIndex(firstPageOfSegment(hit.index));
    }
}

function handleBarMouseMove(event: MouseEvent): void {
    const hit = getSegmentFromEvent(event);
    if (!hit || hit.index === hoveredSegmentIndex) return;
    hoveredSegmentIndex = hit.index;

    if (tooltipVisible) {
        revealTooltip.cancel();
        showPageNumberIndicator(hit.segment, hit.index);
    } else {
        revealTooltip(hit.segment, hit.index);
    }
}

function handleBarMouseLeave(): void {
    revealTooltip.cancel();
    hoveredSegmentIndex = null;
    if (!tooltipVisible) return;
    tooltipVisible = false;
    if (tooltipElement) tooltipElement.style.opacity = "0";
}

function handleVisibleImageIndexChanged(index: number): void {
    visibleImageIndex = index;
    updateProgressBar();
}

const throttledUpdateProgressBar = rafThrottle(updateProgressBar);

function rebuildProgressBar(): void {
    destroyTooltip();
    createProgressBarElement();
    updateProgressBar();
}

export function updatePageData(chapter: ChapterContext, activeIndex = 0): void {
    totalPages = chapter.pageCount;
    visibleImageIndex = clamp(activeIndex, 0, Math.max(0, chapter.pageCount - 1));

    if (CurrentSettings.progressBarStyle === "discrete") {
        createProgressBarElement();
    }
    updateProgressBar();
}

function activate(): void {
    barController = renewController(barController);
    const { signal } = barController;
    for (const key of PROGRESS_BAR_SETTING_KEYS) CurrentSettings.onChange(key, rebuildProgressBar, { signal });
    addEventListener("scroll", throttledUpdateProgressBar, { passive: true, signal });
    addEventListener("resize", throttledUpdateProgressBar, { signal });
    ViewerState.onChange("visibleImageIndex", handleVisibleImageIndexChanged, { signal });

    createProgressBarElement();
    updateProgressBar();
}

function deactivate(): void {
    barController.abort();
    segmentController.abort();

    if (DOM.progressBar) {
        DOM.progressBar.replaceChildren();
        removeClass(DOM.progressBar, "top-0 bottom-0 pt-2 pb-2");
    }
    progressBarElement = null;
    totalPages = 0;
    visibleImageIndex = 0;
    filledSegment = -1;
    destroyTooltip();
}

export function initProgressBar(): void {
    PersistState.onChange("currentView", (view) => (view === "viewer" ? activate() : deactivate()), {
        immediate: true,
    });
}
