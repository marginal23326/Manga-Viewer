import { $$, DOM, setVisible } from "./dom-utils";
import Config from "./config";
import type { Manga } from "@/types";

export function showSpinner(): void {
    // Use flex to center content
    setVisible(DOM.loadingSpinner, true, "flex");
}

export function hideSpinner(): void {
    setVisible(DOM.loadingSpinner, false);
}

export function getMangaImages(): HTMLImageElement[] {
    return DOM.imageContainer ? $$<HTMLImageElement>("img.manga-image", DOM.imageContainer) : [];
}

export function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
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

export async function mapWithConcurrency<T, R>(
    items: readonly T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
    const results: R[] = [];
    let cursor = 0;

    async function worker(): Promise<void> {
        while (cursor < items.length) {
            const current = cursor++;
            const item = items[current];
            if (item === undefined) continue;
            results[current] = await mapper(item, current);
        }
    }

    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    await Promise.all(Array.from({ length: workerCount }, worker));
    return results;
}

export interface GenerationGuard {
    next: () => number;
    isCurrent: (token: number) => boolean;
}

export function createGenerationGuard(): GenerationGuard {
    let current = 0;
    return {
        isCurrent: (token: number) => token === current,
        next: () => ++current,
    };
}

interface ChapterInfo {
    imagesPerChapter: number;
    totalChapters: number;
}

function getChapterInfo(totalImages: number, userProvidedTotalChapters: number): ChapterInfo {
    // Default to a single chapter if userProvidedTotalChapters is 0 or invalid.
    const imagesPerChapter =
        userProvidedTotalChapters > 0 ? Math.max(1, Math.round(totalImages / userProvidedTotalChapters)) : totalImages;

    // Guarantee at least one chapter.
    const totalChapters = imagesPerChapter > 0 ? Math.ceil(totalImages / imagesPerChapter) : 1;

    return { imagesPerChapter, totalChapters };
}

export function getTotalChapters(manga: Pick<Manga, "totalImages" | "userProvidedTotalChapters">): number {
    return getChapterInfo(manga.totalImages, manga.userProvidedTotalChapters).totalChapters;
}

export interface ChapterBounds {
    end: number;
    start: number;
}

export function getChapterBounds(manga: Manga | null | undefined, chapterIndex: number): ChapterBounds {
    if (!manga || chapterIndex < 0) {
        return { end: 0, start: 0 };
    }

    const { imagesPerChapter } = getChapterInfo(manga.totalImages, manga.userProvidedTotalChapters);
    if (!imagesPerChapter) {
        return { end: 0, start: 0 };
    }

    const start = chapterIndex * imagesPerChapter;
    const end = Math.min(start + imagesPerChapter, manga.totalImages);

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
