import { toggleClass } from "../core/DOMUtils";

export function updateViewerControlsVisibility(showViewerControls) {
    const homeButton = document.getElementById("return-to-home");
    if (homeButton) {
        toggleClass(homeButton, "hidden", !showViewerControls);
    }

    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    sidebar.querySelectorAll('[data-viewer-only="true"]').forEach((element) => {
        toggleClass(element, "hidden", !showViewerControls);
    });
}
