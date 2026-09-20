import { type MangaStoreMap, PersistState } from "./persist";
import { createState } from "@/core/create-state";
import { deepEqual } from "@/core/utils";

export function createMangaScopedStore<K extends keyof MangaStoreMap>(
    defaults: MangaStoreMap[K],
    persistKey: K,
    fallbackScope?: string,
) {
    let activeMangaId: string | null = null;
    let touchedKeys = new Set<keyof MangaStoreMap[K]>();
    let flushScheduled = false;

    const state = createState(defaults, (key) => {
        touchedKeys.add(key);
        scheduleFlush();
    });
    const targetId = () => activeMangaId ?? fallbackScope;

    function ownOverrides(id: string | undefined): Partial<MangaStoreMap[K]> {
        if (!id) return {};
        return (PersistState[persistKey][id] ?? {}) as unknown as Partial<MangaStoreMap[K]>;
    }

    function currentRecord(): Partial<MangaStoreMap[K]> {
        const record: Partial<MangaStoreMap[K]> = {};
        for (const key of touchedKeys) {
            record[key] = state[key] as unknown as MangaStoreMap[K][keyof MangaStoreMap[K]];
        }
        return record;
    }

    function writeStoredRecord(id: string, record?: Partial<MangaStoreMap[K]>): void {
        const records = PersistState[persistKey];
        if (deepEqual(records[id] ?? {}, record ?? {})) return;

        const next = { ...records };
        if (record && Object.keys(record).length > 0) next[id] = record;
        else delete next[id];
        PersistState.update(persistKey, next);
    }

    function flush(): void {
        const id = targetId();
        if (!id) return;
        writeStoredRecord(id, currentRecord());
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
        return { ...defaults, ...ownOverrides(fallbackScope), ...ownOverrides(mangaId ?? undefined) };
    }

    function activate(mangaId: string | null): void {
        if (activeMangaId) flush();
        activeMangaId = mangaId;
        const overrides = ownOverrides(targetId());
        touchedKeys = new Set(Object.keys(overrides) as (keyof MangaStoreMap[K])[]);
        state.hydrate(resolveStored(mangaId));
    }

    function clearOverrides(): void {
        const id = targetId();
        if (!id) return;
        touchedKeys.clear();
        writeStoredRecord(id);
        state.hydrate(resolveStored(activeMangaId));
    }

    PersistState.onChange("currentMangaId", activate, { immediate: true });

    return Object.assign(state, { clearOverrides });
}
