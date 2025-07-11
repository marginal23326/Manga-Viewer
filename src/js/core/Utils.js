import Config from "./Config";
import { $, showElement, hideElement } from "./DOMUtils";

export function showSpinner() {
    const spinner = $("#loading-spinner");
    if (spinner) showElement(spinner, "flex"); // Use flex to center content
}

export function hideSpinner() {
    const spinner = $("#loading-spinner");
    if (spinner) hideElement(spinner);
}

export function debounce(func, delay = Config.DEBOUNCE_DELAY) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Function to format chapter bounds (example utility)
export function getChapterBounds(manga, chapterIndex) {
    if (!manga || typeof chapterIndex !== "number" || chapterIndex < 0 || !manga.imagesPerChapter) {
        return { start: 0, end: 0 };
    }

    // Directly use the pre-calculated imagesPerChapter
    const imagesPerChapter = manga.imagesPerChapter;
    const totalImages = manga.totalImages;

    const start = chapterIndex * imagesPerChapter;

    const end = Math.min(start + imagesPerChapter, totalImages);

    return { start, end };
}

// Easing
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function scrollToView(element, behavior = 'smooth', block = 'start') {
    element.scrollIntoView({ behavior, block });
}

export function positionElement(element, target) {
    const targetRect = target.getBoundingClientRect();

    const top = targetRect.bottom;
    const left = targetRect.left;

    element.style.position = 'fixed';
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    element.style.width = `${targetRect.width}px`;
}
