import { $$, DOM, hideElement, showElement } from "./dom-utils";
import Config from "./config";
import type { Manga } from "@/types";

export function showSpinner(): void {
    // Use flex to center content
    if (DOM.loadingSpinner) showElement(DOM.loadingSpinner, "flex");
}

export function hideSpinner(): void {
    if (DOM.loadingSpinner) hideElement(DOM.loadingSpinner);
}

export function getMangaImages(): HTMLImageElement[] {
    return DOM.imageContainer ? $$<HTMLImageElement>("img.manga-image", DOM.imageContainer) : [];
}

export function debounce<Args extends unknown[]>(
    func: (...args: Args) => void,
    delay: number = Config.DEBOUNCE_DELAY_MS,
): (...args: Args) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return (...args: Args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
}

export function setValue<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): void {
    target[key] = value;
}

export function recordValues<T extends object>(record: T): T[keyof T][] {
    return Object.values(record) as T[keyof T][];
}

export function waitForNextPaint(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

export function toInt(value: unknown, fallback = Number.NaN): number {
    const n = Math.trunc(Number(value));
    return Number.isNaN(n) ? fallback : n;
}

export interface ChapterBounds {
    end: number;
    start: number;
}

export function getChapterBounds(manga: Manga | null | undefined, chapterIndex: number): ChapterBounds {
    if (!manga || chapterIndex < 0 || !manga.imagesPerChapter) {
        return { end: 0, start: 0 };
    }

    const { imagesPerChapter, totalImages } = manga;
    const start = chapterIndex * imagesPerChapter;
    const end = Math.min(start + imagesPerChapter, totalImages);

    return { end, start };
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function animateScrollTo(startY: number, endY: number, duration = 300): void {
    let start: number | null = null;

    function step(timestamp: number): void {
        start ??= timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        window.scrollTo(0, startY + (endY - startY) * easeInOutCubic(percentage));
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
}

export function scrollToView(
    element: Element,
    behavior: ScrollBehavior = "smooth",
    block: ScrollLogicalPosition = "start",
): void {
    element.scrollIntoView({ behavior, block });
}

export function positionElement(element: HTMLElement, target: Element): void {
    const targetRect = target.getBoundingClientRect();
    const { bottom: top, left } = targetRect;

    element.style.position = "fixed";
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    element.style.width = `${targetRect.width}px`;
}
