export function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

type Debounced<Args extends unknown[]> = ((...args: Args) => void) & { cancel: () => void };

export function debounce<Args extends unknown[]>(func: (...args: Args) => void, delay = 150): Debounced<Args> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const debounced = (...args: Args): void => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
    debounced.cancel = (): void => clearTimeout(timeoutId);
    return debounced;
}

export function rafThrottle<Args extends unknown[]>(func: (...args: Args) => void): (...args: Args) => void {
    let ticking = false;
    let latestArgs: Args;
    return (...args: Args) => {
        latestArgs = args;
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            func(...latestArgs);
        });
    };
}

export function toInt(value: string | null): number {
    return Math.trunc(Number(value));
}

export function randomId(): string {
    return Math.random().toString(36).slice(2, 10);
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function pluralize(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
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

interface GenerationGuard {
    isCurrent: (token: number) => boolean;
    next: () => number;
}

export function createGenerationGuard(): GenerationGuard {
    let current = 0;
    return {
        isCurrent: (token: number) => token === current,
        next: () => ++current,
    };
}
