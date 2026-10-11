import { CurrentSettings, ViewerState } from "@/state";
import { h } from "@/core/dom-utils";
import { scrollToPage } from "./virtualizer";
import { totalPages } from "./navigation-position";

const PROGRESS_BAR_MAX_SEGMENTS = 150;

const segmentCount = (): number => Math.min(totalPages(), PROGRESS_BAR_MAX_SEGMENTS);

const firstPageOf = (segment: number): number => Math.ceil((segment * totalPages()) / segmentCount());

export function createProgressBar(): HTMLElement {
    const bar = h("div", { id: "progress-bar" });
    let fill: HTMLElement | null = null;

    function syncFill(): void {
        if (!fill || CurrentSettings.progressBarStyle !== "discrete") return;

        const count = segmentCount();
        const segment = Math.floor((ViewerState.visibleImageIndex * count) / totalPages());
        fill.style.setProperty("--progress", String((segment + 1) / count));
    }

    function rebuild(): void {
        const { progressBarEnabled, progressBarPosition, progressBarStyle } = CurrentSettings;
        bar.dataset.position = progressBarPosition;
        bar.dataset.style = progressBarStyle;
        bar.replaceChildren();
        fill = null;
        if (!progressBarEnabled || totalPages() === 0) return;

        fill = h("div", { className: "progress-fill" });
        bar.append(fill);
        if (progressBarStyle === "discrete") {
            for (let i = 0; i < segmentCount(); i++) {
                const page = String(firstPageOf(i) + 1);
                bar.append(h("div", { className: "progress-segment", dataset: { page } }));
            }
        }
        syncFill();
    }

    bar.addEventListener("click", (event) => {
        const { page } = (event.target as HTMLElement).dataset;
        if (page) scrollToPage(Number(page) - 1);
    });

    CurrentSettings.onChange(["progressBarEnabled", "progressBarPosition", "progressBarStyle"], rebuild);
    ViewerState.onChange("activeChapter", rebuild);
    ViewerState.onChange("visibleImageIndex", syncFill);

    return bar;
}
