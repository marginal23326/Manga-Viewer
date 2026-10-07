import { CurrentSettings, ViewerState } from "@/state";
import type { ScrollToIndex } from "./chapter";
import { h } from "@/core/dom-utils";
import { totalPages } from "./navigation-position";

const PROGRESS_BAR_SETTING_KEYS = ["progressBarEnabled", "progressBarPosition", "progressBarStyle"] as const;
const PROGRESS_BAR_MAX_SEGMENTS = 150;

const segmentCount = (): number => Math.min(totalPages(), PROGRESS_BAR_MAX_SEGMENTS);

const firstPageOf = (segment: number): number => Math.ceil((segment * totalPages()) / segmentCount());

export function createProgressBar(scrollToIndex: ScrollToIndex): HTMLElement {
    const bar = h("div", { id: "progress-bar" });

    function syncFill(): void {
        if (!bar.hasChildNodes() || CurrentSettings.progressBarStyle !== "discrete") return;

        const count = segmentCount();
        const segment = Math.floor((ViewerState.visibleImageIndex * count) / totalPages());
        bar.style.setProperty("--progress", String((segment + 1) / count));
    }

    function rebuild(): void {
        const { progressBarEnabled, progressBarPosition, progressBarStyle } = CurrentSettings;
        bar.dataset.position = progressBarPosition;
        bar.dataset.style = progressBarStyle;
        bar.style.removeProperty("--progress");
        bar.replaceChildren();
        if (!progressBarEnabled || totalPages() === 0) return;

        bar.append(h("div", { className: "progress-fill" }));
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
        if (page) scrollToIndex(Number(page) - 1);
    });

    CurrentSettings.onChange(PROGRESS_BAR_SETTING_KEYS, rebuild);
    ViewerState.onChange("activeChapter", rebuild);
    ViewerState.onChange("visibleImageIndex", syncFill);

    return bar;
}
