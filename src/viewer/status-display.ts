import { $, setText } from "@/core/dom-utils";

function updateStatusDisplay(selector: string, text: string): void {
    const display = $(selector);
    if (!display) return;

    setText(display, text);
}

export function updateImageRangeDisplay(start: number, end: number, total: number): void {
    const text = total > 0 ? `PG [ ${start}-${end} ] // ${total}` : "NO DATA";
    updateStatusDisplay("#image-range-display", text);
}

export function updateZoomLevelDisplay(zoomLevel: number): void {
    const text = `ZOOM: ${Math.round(zoomLevel * 100)
        .toString()
        .padStart(3, "0")}%`;
    updateStatusDisplay("#zoom-level-display", text);
}
