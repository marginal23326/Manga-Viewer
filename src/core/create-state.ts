import { emitEvent, onEvent } from "./app-events";
import { deepEqual } from "./utils";

export type State<T extends object> = T &
    EventTarget & {
        hydrate: (values: Partial<T>) => void;
        notify: (key: keyof T) => void;
        onChange: <K extends keyof T>(key: K, listener: (value: T[K]) => void) => void;
        update: <K extends keyof T>(key: K, value: T[K]) => boolean;
    };

interface CreateStateOptions<T extends object> {
    onUpdate?: (key: keyof T, value: T[keyof T]) => void;
}

export function createState<T extends object>(defaults: T, options: CreateStateOptions<T> = {}): State<T> {
    const eventTarget = new EventTarget();
    const target = Object.assign(eventTarget, { ...defaults }) as Record<PropertyKey, unknown>;

    target.update = (key: keyof T, value: T[keyof T]): boolean => {
        if (deepEqual(target[key], value)) return false;

        target[key] = value;
        options.onUpdate?.(key, value);
        (target as State<T>).notify(key);
        return true;
    };

    target.hydrate = (values: Partial<T>): void => {
        Object.assign(target, values);
    };

    target.notify = (key: keyof T): void => {
        emitEvent(eventTarget, `state:${String(key)}`, target[key]);
    };

    target.onChange = <K extends keyof T>(key: K, listener: (value: T[K]) => void): void => {
        onEvent(eventTarget, `state:${String(key)}`, (event: CustomEvent<T[K]>) => listener(event.detail));
    };

    return target as State<T>;
}
