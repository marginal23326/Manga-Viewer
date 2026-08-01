import { $, setText } from "./DOMUtils";

function updateStatusDisplay(selector, text) {
    const display = $(selector);
    if (!display) return;

    setText(display, text);
}

export function updateImageRangeDisplay(start, end, total) {
    const text = total > 0 ? `PG [ ${start}-${end} ] // ${total}` : "NO DATA";
    updateStatusDisplay("#image-range-display", text);
}

export function updateZoomLevelDisplay(zoomLevel) {
    const text = `ZOOM: ${Math.round(zoomLevel * 100)
        .toString()
        .padStart(3, "0")}%`;
    updateStatusDisplay("#zoom-level-display", text);
}
