export function readJson(key: string): unknown {
    const saved = localStorage.getItem(key);
    if (saved === null) return undefined;

    try {
        return JSON.parse(saved);
    } catch (error) {
        console.error(`Failed to load "${key}":`, error);
        localStorage.removeItem(key);
        return undefined;
    }
}

export function writeJson(key: string, value: unknown): void {
    try {
        if (value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Failed to persist "${key}":`, error);
    }
}

const RECORD_KINDS = ["progress", "settings"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export function recordKey(kind: RecordKind, mangaId: string): string {
    return `${kind}:${mangaId}`;
}

export function readOverrides<T extends object>(key: string): Partial<T> {
    const value = readJson(key);
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

export function writeOverrides(key: string, overrides: object): void {
    writeJson(key, Object.keys(overrides).length > 0 ? overrides : undefined);
}

export function deleteMangaRecords(mangaIds: readonly string[]): void {
    for (const id of mangaIds) {
        for (const kind of RECORD_KINDS) localStorage.removeItem(recordKey(kind, id));
    }
}
