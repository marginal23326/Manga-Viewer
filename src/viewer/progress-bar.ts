import { CurrentSettings, ViewerState, getCurrentManga } from "@/state";
import { addClass, h, removeClass, toggleClass } from "@/core/dom-utils";
import { currentPageIndex, scrollProgress, totalPages } from "./navigation-position";
import { debounce, rafThrottle } from "@/core/utils";
import type { ScrollToIndex } from "./chapter";

const PROGRESS_BAR_SETTING_KEYS = ["progressBarEnabled", "progressBarPosition", "progressBarStyle"] as const;
const PROGRESS_BAR_MAX_SEGMENTS = 150;

function segmentCount(): number {
    return Math.min(totalPages(), PROGRESS_BAR_MAX_SEGMENTS);
}

function pagesPerSegment(): number {
    const count = segmentCount();
    return count > 0 ? totalPages() / count : 1;
}

function segmentForPage(pageIndex: number): number {
    const count = segmentCount();
    return count > 0 ? Math.min(count - 1, Math.floor(pageIndex / pagesPerSegment())) : 0;
}

function firstPageOfSegment(segmentIndex: number): number {
    return Math.min(totalPages() - 1, Math.round(segmentIndex * pagesPerSegment()));
}

function createSegment(index: number, vertical: boolean): HTMLDivElement {
    const divider = vertical ? "border-b last:border-b-0" : "border-r last:border-r-0";
    return h("div", {
        className: `flex-1 bg-ink/20 dark:bg-paper/20 hover:bg-accent dark:hover:bg-accent-light cursor-pointer border-paper dark:border-ink relative ${divider}`,
        dataset: { index: String(index) },
    });
}

export function createProgressBar(scrollToIndex: ScrollToIndex): HTMLElement {
    const container = h("div", {
        className: "fixed z-50 overflow-visible empty:hidden group",
        id: "progress-bar",
    });

    let progressBarElement: HTMLDivElement | null = null;
    let hoveredSegmentIndex: number | null = null;
    let filledSegment = -1;

    let tooltipElement: HTMLSpanElement | null = null;
    let tooltipVisible = false;

    function showPageNumberIndicator(segment: HTMLElement, segmentIndex: number): void {
        if (!tooltipElement) {
            tooltipElement = h("span", {
                className:
                    "pill fixed z-50 min-w-7 h-6 px-2 text-[11px] opacity-0 pointer-events-none transition-opacity duration-150 ease-out shadow-float",
            });
            tooltipElement.style.transform =
                CurrentSettings.progressBarPosition === "left" ? "translateY(-50%)" : "translateX(-50%)";
            document.body.append(tooltipElement);
        }
        const tooltip = tooltipElement;

        tooltip.textContent = `${firstPageOfSegment(segmentIndex) + 1}`;

        const rect = segment.getBoundingClientRect();
        if (CurrentSettings.progressBarPosition === "left") {
            tooltip.style.left = `${rect.right + 10}px`;
            tooltip.style.top = `${rect.top + rect.height / 2}px`;
        } else {
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.bottom = `${innerHeight - rect.top + 10}px`;
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

    function createProgressBarElement(): void {
        progressBarElement = null;
        filledSegment = -1;
        revealTooltip.cancel();
        hoveredSegmentIndex = null;

        if (!CurrentSettings.progressBarEnabled || totalPages() === 0) {
            container.replaceChildren();
            return;
        }

        const isLeft = CurrentSettings.progressBarPosition === "left";

        if (CurrentSettings.progressBarStyle === "continuous") {
            const layout = isLeft ? "inset-y-0 left-0 w-1 group-hover:w-3" : "inset-x-0 bottom-0 h-1 group-hover:h-3";
            progressBarElement = h("div", {
                className: `absolute bg-accent dark:bg-accent-light transition-[width,height] duration-100 ease-linear ${layout}`,
            });
            progressBarElement.style[isLeft ? "height" : "width"] = "0%";
        } else if (CurrentSettings.progressBarStyle === "discrete") {
            const layout = isLeft
                ? "inset-y-0 left-0 w-2.5 flex-col border-x dark:border-r-ink group-hover:w-4 transition-[width]"
                : "inset-x-0 bottom-0 h-2.5 border-y dark:border-t-ink group-hover:h-4 transition-[height]";
            progressBarElement = h("div", {
                className: `absolute flex duration-150 ease-in-out ${layout}`,
            });

            for (let i = 0; i < segmentCount(); i++) {
                progressBarElement.append(createSegment(i, isLeft));
            }
            progressBarElement.addEventListener("click", handleBarClick);
            progressBarElement.addEventListener("mousemove", handleBarMouseMove);
            progressBarElement.addEventListener("mouseleave", handleBarMouseLeave);
        }

        if (progressBarElement) {
            container.replaceChildren(progressBarElement);
        }

        removeClass(container, "inset-x-0 inset-y-0 left-0 bottom-0 top-0 w-3 h-3 w-full h-full");
        addClass(container, isLeft ? "inset-y-0 left-0 w-3" : "inset-x-0 bottom-0 h-3");
    }

    function updateProgressBar(): void {
        if (!CurrentSettings.progressBarEnabled || !progressBarElement || !getCurrentManga()) return;
        const bar = progressBarElement;

        if (CurrentSettings.progressBarStyle === "continuous") {
            bar.style[CurrentSettings.progressBarPosition === "left" ? "height" : "width"] =
                `${scrollProgress() * 100}%`;
        } else if (CurrentSettings.progressBarStyle === "discrete") {
            const currentSegment = segmentForPage(currentPageIndex());
            if (currentSegment === filledSegment) return;

            const [from, to] =
                currentSegment > filledSegment
                    ? [filledSegment + 1, currentSegment]
                    : [currentSegment + 1, filledSegment];
            for (let i = from; i <= to; i++) {
                const segment = bar.children[i];
                if (!segment) continue;
                toggleClass(segment, "bg-accent dark:bg-accent-light", i <= currentSegment);
                toggleClass(segment, "bg-ink/20 dark:bg-paper/20", i > currentSegment);
            }
            filledSegment = currentSegment;
        }
    }

    function getSegmentFromEvent(event: MouseEvent): { index: number; segment: HTMLElement } | null {
        const segment = (event.target as HTMLElement | null)?.closest<HTMLElement>("div");
        if (!segment || segment.parentElement !== progressBarElement) return null;
        const index = Number(segment.dataset.index);
        if (Number.isNaN(index) || index < 0) return null;
        return { index, segment };
    }

    function handleBarClick(event: MouseEvent): void {
        const hit = getSegmentFromEvent(event);
        if (hit) {
            scrollToIndex(firstPageOfSegment(hit.index));
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

    const throttledUpdateProgressBar = rafThrottle(updateProgressBar);

    function rebuildProgressBar(): void {
        destroyTooltip();
        createProgressBarElement();
        updateProgressBar();
    }

    CurrentSettings.onChange(PROGRESS_BAR_SETTING_KEYS, rebuildProgressBar);
    addEventListener("scroll", throttledUpdateProgressBar, { passive: true });
    addEventListener("resize", throttledUpdateProgressBar);
    ViewerState.onChange("activeChapter", rebuildProgressBar);
    ViewerState.onChange("visibleImageIndex", updateProgressBar);

    return container;
}
