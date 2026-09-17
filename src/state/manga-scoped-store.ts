import { type MangaStoreMap, PersistState } from "./persist";
import { createState } from "@/core/create-state";
import { deepEqual } from "@/core/utils";

export function createMangaScopedStore<K extends keyof MangaStoreMap>(
    defaults: MangaStoreMap[K],
    persistKey: K,
    fallbackScope?: string,
) {
    let activeMangaId: string | null = null;
    let flushScheduled = false;

    const state = createState(defaults, scheduleFlush);
    const targetId = () => activeMangaId ?? fallbackScope;

    function sparseRecord(): Partial<MangaStoreMap[K]> {
        const record: Partial<MangaStoreMap[K]> = {};
        const base = activeMangaId && fallbackScope ? resolveStored(null) : defaults;

        for (const k of Object.keys(defaults) as (keyof MangaStoreMap[K])[]) {
            if (!deepEqual(state[k], base[k]))
                record[k] = state[k] as unknown as MangaStoreMap[K][keyof MangaStoreMap[K]];
        }
        return record;
    }

    function flush(): void {
        const id = targetId();
        if (!id) return;

        const records = PersistState[persistKey];
        const sparse = sparseRecord();
        if (deepEqual(records[id] ?? {}, sparse)) return;

        const next = { ...records };
        if (Object.keys(sparse).length > 0) next[id] = sparse;
        else delete next[id];
        PersistState.update(persistKey, next);
    }

    function scheduleFlush(): void {
        if (flushScheduled || !targetId()) return;
        flushScheduled = true;
        queueMicrotask(() => {
            flushScheduled = false;
            flush();
        });
    }

    function resolveStored(mangaId: string | null): MangaStoreMap[K] {
        const records = PersistState[persistKey];
        return {
            ...defaults,
            ...(fallbackScope ? records[fallbackScope] : undefined),
            ...(mangaId ? records[mangaId] : undefined),
        };
    }

    function activate(mangaId: string | null): void {
        if (activeMangaId) flush();
        activeMangaId = mangaId;
        state.hydrate(resolveStored(mangaId));
    }

    PersistState.onChange("currentMangaId", activate, { immediate: true });

    return { flush, state };
}
