import { setText } from "./DOMUtils";

export function updateImageRangeDisplay(start, end, total) {
    const element = document.getElementById("image-range-display");
    if (!element) return;

    if (total > 0) {
        setText(element, `PG [ ${start}-${end} ] // ${total}`);
        return;
    }

    setText(element, "NO DATA");
}
