import { $, $$, DOM, toggleClass } from "@/core/dom-utils";

export function updateViewerControlsVisibility(showViewerControls: boolean): void {
    const homeButton = $("#return-to-home");
    if (homeButton) {
        toggleClass(homeButton, "hidden", !showViewerControls);
    }

    const { sidebar } = DOM;
    if (!sidebar) return;

    $$('[data-viewer-only="true"]', sidebar).forEach((element) => {
        toggleClass(element, "hidden", !showViewerControls);
    });
}
