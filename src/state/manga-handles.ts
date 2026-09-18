const DB_NAME = "manga-viewer";
const STORE_NAME = "manga-folders";

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error as Error));
    });
}

function openDb(): Promise<IDBDatabase> {
    const request = indexedDB.open(DB_NAME, 1);
    request.addEventListener("upgradeneeded", () => request.result.createObjectStore(STORE_NAME));
    return toPromise(request);
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
    dbPromise ??= openDb();
    return dbPromise;
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<unknown> {
    const database = await db();
    return toPromise(run(database.transaction(STORE_NAME, mode).objectStore(STORE_NAME)));
}

export async function pickMangaFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
        return await showDirectoryPicker({ id: "manga-folder", mode: "read" });
    } catch {
        return null;
    }
}

export async function getAccessibleHandle(mangaId: string): Promise<FileSystemDirectoryHandle | null> {
    try {
        const handle = await withStore("readonly", (store) => store.get(mangaId));
        if (!(handle instanceof FileSystemDirectoryHandle)) return null;
        return (await handle.requestPermission({ mode: "read" })) === "granted" ? handle : null;
    } catch {
        return null;
    }
}

export async function saveStoredHandle(mangaId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    await withStore("readwrite", (store) => store.put(handle, mangaId));
}

export async function deleteStoredHandles(mangaIds: readonly string[]): Promise<void> {
    for (const id of mangaIds) {
        await withStore("readwrite", (store) => store.delete(id));
    }
}
