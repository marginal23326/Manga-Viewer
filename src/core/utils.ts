export function deepEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

export function debounce<Args extends unknown[]>(func: (...args: Args) => void, delay = 150): (...args: Args) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
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

export async function forEachWithConcurrency<T>(
    items: readonly T[],
    concurrency: number,
    task: (item: T) => Promise<void>,
): Promise<void> {
    let cursor = 0;

    async function worker(): Promise<void> {
        while (cursor < items.length) {
            const item = items[cursor++];
            if (item !== undefined) await task(item);
        }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
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
