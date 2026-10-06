import type { State } from "./create-state";

export interface Binding<T> {
    set: (value: T) => void;
    subscribe: (listener: (value: T) => void, signal?: AbortSignal) => void;
}

export function bind<T extends object, K extends keyof T>(state: State<T>, key: K): Binding<T[K]> {
    return {
        set: (value) => state.update(key, value),
        subscribe: (listener, signal) => state.onChange(key, listener, { immediate: true, signal }),
    };
}
