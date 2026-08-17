import { $, setText } from "@/core/dom-utils";

function updateStatusDisplay(selector: string, text: string): void {
    const display = $(selector);
    if (!display) return;

    setText(display, text);
}

export function updateImageRangeDisplay(start: number, end: number, total: number): void {
    const text = total > 0 ? `${start}–${end} / ${total}` : "—";
    updateStatusDisplay("#image-range-display", text);
}

export function updateZoomLevelDisplay(zoomLevel: number): void {
    const text = `${Math.round(zoomLevel * 100)}%`;
    updateStatusDisplay("#zoom-level-display", text);
}
