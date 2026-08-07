import type { ThemePreference } from "@/types";

export interface AppEventMap {
    chapterSelectorSync: { currentChapter: number; totalChapters: number };
    navHideRequested: undefined;
    themeChanged: { themePreference: ThemePreference };
    visibleImageChanged: { imageIndex: number };
}

export const AppEvents = new EventTarget();

export function onAppEvent<K extends keyof AppEventMap>(
    type: K,
    listener: (event: CustomEvent<AppEventMap[K]>) => void,
): void {
    AppEvents.addEventListener(type, listener as EventListener);
}

export function offAppEvent<K extends keyof AppEventMap>(
    type: K,
    listener: (event: CustomEvent<AppEventMap[K]>) => void,
): void {
    AppEvents.removeEventListener(type, listener as EventListener);
}

export function emitAppEvent<K extends keyof AppEventMap>(
    type: K,
    ...[detail]: AppEventMap[K] extends undefined ? [detail?: undefined] : [detail: AppEventMap[K]]
): void {
    AppEvents.dispatchEvent(new CustomEvent(type, { detail }));
}
