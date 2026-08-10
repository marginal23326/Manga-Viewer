import { emitEvent, onEvent } from "./app-events";

export type State<T extends object> = T & {
    hydrate: (values: Partial<T>) => void;
    update: <K extends keyof T>(key: K, value: T[K]) => boolean;
};

export type EventedState<T extends object> = State<T> &
    EventTarget & {
        notify: (key: keyof T) => void;
        onChange: <K extends keyof T>(key: K, listener: (value: T[K]) => void) => void;
    };

interface CreateStateOptions<T extends object> {
    eventTarget?: EventTarget;
    onUpdate?: (state: EventedState<T>, key: keyof T, value: T[keyof T]) => void;
}

export function createState<T extends object>(defaults: T): State<T>;
export function createState<T extends object>(
    defaults: T,
    options: CreateStateOptions<T> & { eventTarget: EventTarget },
): EventedState<T>;
export function createState<T extends object>(
    defaults: T,
    options?: CreateStateOptions<T>,
): State<T> | EventedState<T> {
    const eventTarget = options?.eventTarget;
    const target: Record<PropertyKey, unknown> = eventTarget
        ? (Object.assign(eventTarget, { ...defaults }) as Record<PropertyKey, unknown>)
        : ({ ...defaults } as Record<PropertyKey, unknown>);

    target.update = (key: keyof T, value: T[keyof T]): boolean => {
        if (target[key] === value) return false;

        target[key] = value;
        options?.onUpdate?.(target as EventedState<T>, key, value);
        return true;
    };

    target.hydrate = (values: Partial<T>): void => {
        Object.assign(target, values);
    };

    if (eventTarget) {
        target.notify = (key: keyof T): void => {
            emitEvent(eventTarget, `state:${String(key)}`, target[key]);
        };
        target.onChange = (key: keyof T, listener: (value: unknown) => void): void => {
            onEvent(eventTarget, `state:${String(key)}`, (event: CustomEvent) => listener(event.detail));
        };
    }

    return target as State<T> | EventedState<T>;
}
