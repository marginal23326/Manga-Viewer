import { type MangaStoreMap, PersistState } from "./persist";
import { createState } from "@/core/create-state";
import { deepEqual } from "@/core/utils";

export function createMangaScopedStore<K extends keyof MangaStoreMap>(defaults: MangaStoreMap[K], persistKey: K) {
    let activeMangaId: string | null = null;
    let flushScheduled = false;

    const state = createState(defaults, scheduleFlush);

    function sparseRecord(): Partial<MangaStoreMap[K]> {
        const record: Partial<MangaStoreMap[K]> = {};
        for (const k of Object.keys(defaults) as (keyof MangaStoreMap[K])[]) {
            if (!deepEqual(state[k], defaults[k])) record[k] = state[k];
        }
        return record;
    }

    function flush(): void {
        const mangaId = activeMangaId;
        if (!mangaId) return;

        const records = PersistState[persistKey];
        const sparse = sparseRecord();
        if (deepEqual(records[mangaId] ?? {}, sparse)) return;

        const next = { ...records };
        if (Object.keys(sparse).length > 0) next[mangaId] = sparse;
        else delete next[mangaId];
        PersistState.update(persistKey, next);
    }

    function scheduleFlush(): void {
        if (flushScheduled || !activeMangaId) return;
        flushScheduled = true;
        queueMicrotask(() => {
            flushScheduled = false;
            flush();
        });
    }

    function resolveStored(mangaId: string | null): MangaStoreMap[K] {
        const records = PersistState[persistKey];
        return { ...defaults, ...(mangaId ? records[mangaId] : undefined) };
    }

    function discardDraft(): void {
        state.hydrate(resolveStored(activeMangaId));
    }

    function isActive(mangaId: string): boolean {
        return activeMangaId === mangaId;
    }

    function activate(mangaId: string | null): void {
        if (activeMangaId) flush();
        activeMangaId = mangaId;
        state.hydrate(resolveStored(mangaId));
    }

    PersistState.onChange("currentMangaId", activate);
    activate(PersistState.currentMangaId);

    return { discardDraft, flush, isActive, state };
}
