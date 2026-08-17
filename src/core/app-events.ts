import type { ThemePreference } from "@/types";

export function onEvent<T>(target: EventTarget, type: string, listener: (event: CustomEvent<T>) => void): void {
    target.addEventListener(type, listener as EventListener);
}

function offEvent<T>(target: EventTarget, type: string, listener: (event: CustomEvent<T>) => void): void {
    target.removeEventListener(type, listener as EventListener);
}

export function emitEvent<T>(target: EventTarget, type: string, detail?: T): void {
    target.dispatchEvent(new CustomEvent(type, { detail }));
}

export interface AppEventMap {
    chapterSelectorSync: { currentChapter: number; totalChapters: number };
    navHideRequested: undefined;
    themeChanged: { themePreference: ThemePreference };
    viewChanged: { showViewer: boolean };
    visibleImageChanged: { imageIndex: number };
}

const AppEvents = new EventTarget();

export function onAppEvent<K extends keyof AppEventMap>(
    type: K,
    listener: (event: CustomEvent<AppEventMap[K]>) => void,
): void {
    onEvent(AppEvents, type, listener);
}

export function offAppEvent<K extends keyof AppEventMap>(
    type: K,
    listener: (event: CustomEvent<AppEventMap[K]>) => void,
): void {
    offEvent(AppEvents, type, listener);
}

export function emitAppEvent<K extends keyof AppEventMap>(
    type: K,
    ...[detail]: AppEventMap[K] extends undefined ? [detail?: undefined] : [detail: AppEventMap[K]]
): void {
    emitEvent(AppEvents, type, detail);
}
