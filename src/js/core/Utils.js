import { $, showElement, hideElement } from './DOMUtils';
import Config from './Config';

export function showSpinner() {
    const spinner = $('#loading-spinner');
    if (spinner) showElement(spinner, 'flex'); // Use flex to center content
}

export function hideSpinner() {
    const spinner = $('#loading-spinner');
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

// Simple unique ID generator (for manga if needed, though timestamp is used)
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Function to format chapter bounds (example utility)
export function getChapterBounds(manga, chapterIndex) {
    if (!manga || typeof chapterIndex !== 'number' || chapterIndex < 0) {
        return { start: 0, end: 0 };
    }
    // Ensure imagesPerChapter is calculated correctly
    const imagesPerChapter = manga.imagesPerChapter || Math.ceil(manga.totalImages / manga.totalChapters);
    if (!imagesPerChapter || imagesPerChapter <= 0) {
         console.warn("Invalid imagesPerChapter for manga:", manga.title);
         return { start: 0, end: 0 };
    }

    const start = chapterIndex * imagesPerChapter;
    const end = Math.min((chapterIndex + 1) * imagesPerChapter, manga.totalImages);
    return { start, end };
}

// Easing function (example)
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Add other general utility functions here