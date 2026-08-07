export type State<T extends object> = T & {
    update: <K extends keyof T>(key: K, value: T[K]) => boolean;
};

export type EventedState<T extends object> = State<T> &
    EventTarget & {
        notify: (key: keyof T) => void;
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

    if (eventTarget) {
        target.notify = (key: keyof T): void => {
            eventTarget.dispatchEvent(new CustomEvent(`state:${String(key)}`, { detail: target[key] }));
        };
    }

    return target as State<T> | EventedState<T>;
}
