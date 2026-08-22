import type { ThemePreference } from "@/types";

export function onEvent<T>(
    target: EventTarget,
    type: string,
    listener: (event: CustomEvent<T>) => void,
    options?: AddEventListenerOptions,
): void {
    target.addEventListener(type, listener as EventListener, options);
}

export function emitEvent<T>(target: EventTarget, type: string, detail?: T): void {
    target.dispatchEvent(new CustomEvent(type, { detail }));
}

export interface AppEventMap {
    chapterSelectorSync: { currentChapter: number; totalChapters: number };
    imageRangeChanged: { start: number; end: number; total: number };
    navHideRequested: undefined;
    pageSizingChanged: undefined;
    themeChanged: { themePreference: ThemePreference };
    viewChanged: { showViewer: boolean };
    viewerScroll: undefined;
    visibleImageChanged: { imageIndex: number };
}

const AppEvents = new EventTarget();

export function onAppEvent<K extends keyof AppEventMap>(
    type: K,
    listener: (event: CustomEvent<AppEventMap[K]>) => void,
    options?: AddEventListenerOptions,
): void {
    onEvent(AppEvents, type, listener, options);
}

export function emitAppEvent<K extends keyof AppEventMap>(type: K, detail?: AppEventMap[K]): void {
    emitEvent(AppEvents, type, detail);
}
