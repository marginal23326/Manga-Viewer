import { deepEqual } from "./utils";

interface OnChangeOptions {
    immediate?: boolean;
    signal?: AbortSignal;
}

interface StateApi<T extends object> {
    hydrate: (values: Partial<T>) => void;
    onChange: <K extends keyof T>(
        keys: K | readonly K[],
        listener: (value: T[K]) => void,
        options?: OnChangeOptions,
    ) => void;
    update: <K extends keyof T>(key: K, value: T[K]) => boolean;
}

export type State<T extends object> = Readonly<T> & StateApi<T>;

export function createState<T extends object>(
    defaults: T,
    onUpdate?: (key: keyof T, value: T[keyof T]) => void,
): State<T> {
    const data = { ...defaults };
    const subscribers = new Map<keyof T, Set<() => void>>();

    function apply<K extends keyof T>(key: K, value: T[K], persist: boolean): boolean {
        if (deepEqual(data[key], value)) return false;

        data[key] = value;
        if (persist) onUpdate?.(key, value);
        for (const run of subscribers.get(key) ?? []) run();
        return true;
    }

    return Object.assign(data, {
        // set + notify, no persist
        hydrate(values: Partial<T>): void {
            for (const key of Object.keys(values) as (keyof T)[]) {
                const value = values[key];
                if (value !== undefined) apply(key, value, false);
            }
        },

        onChange<K extends keyof T>(
            keys: K | readonly K[],
            listener: (value: T[K]) => void,
            { immediate = false, signal }: OnChangeOptions = {},
        ): void {
            if (signal?.aborted) return;
            for (const key of typeof keys === "object" ? keys : [keys]) {
                const run = (): void => listener(data[key]);
                if (immediate) run();

                const set = subscribers.get(key) ?? new Set();
                subscribers.set(key, set.add(run));
                signal?.addEventListener("abort", () => set.delete(run), { once: true });
            }
        },

        // set + notify + persist
        update: <K extends keyof T>(key: K, value: T[K]): boolean => apply(key, value, true),
    });
}
