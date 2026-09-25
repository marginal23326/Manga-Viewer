import { type MangaStoreMap, PersistState } from "./persist";
import { ViewerState } from "./viewer-state";
import { createState } from "@/core/create-state";

export function createMangaScopedStore<K extends keyof MangaStoreMap>(
    defaults: MangaStoreMap[K],
    persistKey: K,
    fallbackScope?: string,
) {
    let activeMangaId: string | null = null;

    const targetId = () => activeMangaId ?? fallbackScope;

    const state = createState(defaults, (key, value) => {
        const id = targetId();
        if (!id) return;
        const records = PersistState[persistKey];
        PersistState.update(persistKey, {
            ...records,
            [id]: { ...records[id], [key]: value },
        });
    });

    function ownOverrides(id: string | undefined): Partial<MangaStoreMap[K]> {
        if (!id) return {};
        return (PersistState[persistKey][id] ?? {}) as unknown as Partial<MangaStoreMap[K]>;
    }

    function resolveStored(mangaId: string | null): MangaStoreMap[K] {
        return { ...defaults, ...ownOverrides(fallbackScope), ...ownOverrides(mangaId ?? undefined) };
    }

    function activate(mangaId: string | null): void {
        activeMangaId = mangaId;
        state.hydrate(resolveStored(mangaId));
    }

    function clearOverrides(): void {
        const id = targetId();
        if (!id || !(id in PersistState[persistKey])) return;
        const next = { ...PersistState[persistKey] };
        delete next[id];
        PersistState.update(persistKey, next);
        state.hydrate(resolveStored(activeMangaId));
    }

    ViewerState.onChange("currentMangaId", activate, { immediate: true });

    return Object.assign(state, { clearOverrides });
}
