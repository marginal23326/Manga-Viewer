import { $, $$, toggleClass } from "../core/DOMUtils";

export function updateViewerControlsVisibility(showViewerControls) {
    const homeButton = $("#return-to-home");
    if (homeButton) {
        toggleClass(homeButton, "hidden", !showViewerControls);
    }

    const sidebar = $("#sidebar");
    if (!sidebar) return;

    $$('[data-viewer-only="true"]', sidebar).forEach((element) => {
        toggleClass(element, "hidden", !showViewerControls);
    });
}
