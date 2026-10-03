import { readJson, recordKey, writeJson } from "./storage";
import { ViewerState } from "./viewer-state";
import { createState } from "@/core/create-state";

function readOverrides<T extends object>(key: string): Partial<T> {
    const value = readJson(key);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function writeOverrides(key: string, overrides: object): void {
    writeJson(key, Object.keys(overrides).length > 0 ? overrides : undefined);
}

export function createMangaScopedStore<T extends object>(defaults: T, kind: string, { hasGlobalScope = false } = {}) {
    let activeMangaId: string | null = null;

    const targetKey = (): string | null => {
        if (activeMangaId !== null) return recordKey(kind, activeMangaId);
        return hasGlobalScope ? kind : null;
    };

    const state = createState(defaults, (key, value) => {
        const target = targetKey();
        if (target) writeOverrides(target, { ...readOverrides<T>(target), [key]: value });
    });

    function resolve(mangaId: string | null): T {
        return {
            ...defaults,
            ...(hasGlobalScope ? readOverrides<T>(kind) : {}),
            ...(mangaId === null ? {} : readOverrides<T>(recordKey(kind, mangaId))),
        };
    }

    function activate(mangaId: string | null): void {
        activeMangaId = mangaId;
        state.hydrate(resolve(mangaId));
    }

    function snapshotOverrides(): Partial<T> {
        const target = targetKey();
        return target ? readOverrides<T>(target) : {};
    }

    function restoreOverrides(snapshot: Partial<T>): void {
        const target = targetKey();
        if (!target) return;
        writeOverrides(target, snapshot);
        state.hydrate(resolve(activeMangaId));
    }

    ViewerState.onChange("currentMangaId", activate, { immediate: true });

    return Object.assign(state, { resolve, restoreOverrides, snapshotOverrides });
}
