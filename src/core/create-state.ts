import { deepEqual } from "./utils";

interface OnChangeOptions extends AddEventListenerOptions {
    immediate?: boolean;
}

interface StateApi<T extends object> {
    hydrate: (values: Partial<T>) => void;
    notify: (key: keyof T) => void;
    onChange: <K extends keyof T>(key: K, listener: (value: T[K]) => void, options?: OnChangeOptions) => void;
    update: <K extends keyof T>(key: K, value: T[K]) => boolean;
}

type State<T extends object> = T & EventTarget & StateApi<T>;

class StateTarget<T extends object> extends EventTarget implements StateApi<T> {
    readonly #onUpdate?: (key: keyof T, value: T[keyof T]) => void;

    constructor(onUpdate?: (key: keyof T, value: T[keyof T]) => void) {
        super();
        this.#onUpdate = onUpdate;
    }

    // notify only — no persist
    hydrate(values: Partial<T>): void {
        for (const key of Object.keys(values) as (keyof T)[]) {
            const value = values[key];
            const self = this as unknown as T;
            if (value === undefined || deepEqual(self[key], value)) continue;

            self[key] = value;
            this.notify(key);
        }
    }

    notify(key: keyof T): void {
        this.dispatchEvent(new CustomEvent(`state:${String(key)}`, { detail: (this as unknown as T)[key] }));
    }

    onChange<K extends keyof T>(key: K, listener: (value: T[K]) => void, options?: OnChangeOptions): void {
        if (options?.immediate) listener((this as unknown as T)[key]);
        this.addEventListener(
            `state:${String(key)}`,
            ((event: CustomEvent<T[K]>) => listener(event.detail)) as EventListener,
            options,
        );
    }

    // notify + persist
    update<K extends keyof T>(key: K, value: T[K]): boolean {
        const self = this as unknown as T;
        if (deepEqual(self[key], value)) return false;

        self[key] = value;
        this.#onUpdate?.(key, value);
        this.notify(key);
        return true;
    }
}

export function createState<T extends object>(
    defaults: T,
    onUpdate?: (key: keyof T, value: T[keyof T]) => void,
): State<T> {
    return Object.assign(new StateTarget(onUpdate), defaults);
}
