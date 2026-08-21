import Config from "./config";

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

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
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
