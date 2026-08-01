import { $, hideElement, showElement } from "./DOMUtils";
import Config from "./Config";

export function showSpinner() {
    const spinner = $("#loading-spinner");
    // Use flex to center content
    if (spinner) showElement(spinner, "flex");
}

export function hideSpinner() {
    const spinner = $("#loading-spinner");
    if (spinner) hideElement(spinner);
}

export function debounce(func, delay = Config.DEBOUNCE_DELAY_MS) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
}

export function getChapterBounds(manga, chapterIndex) {
    if (!manga || typeof chapterIndex !== "number" || chapterIndex < 0 || !manga.imagesPerChapter) {
        return { end: 0, start: 0 };
    }

    const { imagesPerChapter, totalImages } = manga;

    const start = chapterIndex * imagesPerChapter;

    const end = Math.min(start + imagesPerChapter, totalImages);

    return { end, start };
}

export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function scrollToView(element, behavior = "smooth", block = "start") {
    element.scrollIntoView({ behavior, block });
}

export function positionElement(element, target) {
    const targetRect = target.getBoundingClientRect();

    const { bottom: top, left } = targetRect;

    element.style.position = "fixed";
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    element.style.width = `${targetRect.width}px`;
}
