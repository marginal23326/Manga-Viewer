export interface ImageDims {
    height: number;
    width: number;
}

interface MangaFileCache {
    dims: Map<number, ImageDims>;
    files?: Promise<FileSystemFileHandle[]>;
}

const mangaCaches = new Map<string, MangaFileCache>();

function cacheFor(mangaId: string): MangaFileCache {
    let cache = mangaCaches.get(mangaId);
    if (!cache) {
        cache = { dims: new Map() };
        mangaCaches.set(mangaId, cache);
    }
    return cache;
}

export async function pickMangaFolder(): Promise<FileSystemDirectoryHandle | null> {
    try {
        return await showDirectoryPicker({ id: "manga-folder", mode: "read" });
    } catch {
        return null;
    }
}

const IMAGE_EXTENSIONS = new Set(["gif", "jpeg", "jpg", "png", "webp"]);
const numericCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function isImageFile(name: string): boolean {
    return IMAGE_EXTENSIONS.has(name.slice(name.lastIndexOf(".") + 1).toLowerCase());
}

export async function scanMangaFolder(handle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const files: FileSystemFileHandle[] = [];
    for await (const entry of handle.values()) {
        if (entry.kind === "file" && isImageFile(entry.name)) files.push(entry);
    }
    return files.toSorted((a, b) => numericCollator.compare(a.name, b.name));
}

const DB_NAME = "manga-viewer";
const STORE_NAME = "manga-folders";

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.addEventListener("upgradeneeded", () => request.result.createObjectStore(STORE_NAME));
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error as Error));
    });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
        request.addEventListener("success", () => resolve(request.result));
        request.addEventListener("error", () => reject(request.error as Error));
    });
}

async function getStoredHandle(mangaId: string): Promise<FileSystemDirectoryHandle | null> {
    try {
        const handle = await withStore<FileSystemDirectoryHandle | undefined>("readonly", (store) =>
            store.get(mangaId),
        );
        return handle ?? null;
    } catch {
        return null;
    }
}

export async function adoptMangaFolder(mangaId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    mangaCaches.delete(mangaId);
    await withStore("readwrite", (store) => store.put(handle, mangaId));
}

export async function forgetMangaFolders(mangaIds: readonly string[]): Promise<void> {
    for (const id of mangaIds) mangaCaches.delete(id);

    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        for (const id of mangaIds) tx.objectStore(STORE_NAME).delete(id);
        tx.addEventListener("complete", () => resolve());
        tx.addEventListener("error", () => reject(tx.error as Error));
    });
}

async function getAccessibleHandle(mangaId: string): Promise<FileSystemDirectoryHandle | null> {
    const handle = await getStoredHandle(mangaId);
    if (!handle) return null;
    try {
        return (await handle.requestPermission({ mode: "read" })) === "granted" ? handle : null;
    } catch {
        return null;
    }
}

function getFileList(mangaId: string): Promise<FileSystemFileHandle[]> {
    const cache = cacheFor(mangaId);
    if (!cache.files) {
        cache.files = getAccessibleHandle(mangaId).then((handle) => {
            if (!handle) throw new Error(`No access to manga folder: ${mangaId}`);
            return scanMangaFolder(handle);
        });
        cache.files.catch(() => {
            cache.files = undefined;
        });
    }
    return cache.files;
}

export async function getMangaImageCount(mangaId: string): Promise<number | null> {
    try {
        const files = await getFileList(mangaId);
        return files.length;
    } catch {
        return null;
    }
}

export function getCachedPageDimensions(mangaId: string, index: number): ImageDims | null {
    return mangaCaches.get(mangaId)?.dims.get(index) ?? null;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    const url = URL.createObjectURL(file);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => {
            URL.revokeObjectURL(url);
            resolve(img);
        });
        img.addEventListener("error", () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to decode image: ${file.name}`));
        });
        img.src = url;
    });
}

async function getImageFile(mangaId: string, index: number): Promise<File | null> {
    try {
        const files = await getFileList(mangaId);
        const fileHandle = files[index];
        if (!fileHandle) return null;
        return await fileHandle.getFile();
    } catch (error) {
        console.warn(`Failed to read image file ${index} for manga ${mangaId}:`, error);
        return null;
    }
}

export async function loadImage(mangaId: string, index: number): Promise<HTMLImageElement | null> {
    const file = await getImageFile(mangaId, index);
    if (!file) return null;

    try {
        const img = await loadImageFromFile(file);
        if (img.naturalWidth && img.naturalHeight) {
            cacheFor(mangaId).dims.set(index, { height: img.naturalHeight, width: img.naturalWidth });
        }
        return img;
    } catch (error) {
        console.warn(`Failed to decode image ${index} for manga ${mangaId}:`, error);
        return null;
    }
}

export async function getImageUrl(mangaId: string, index: number): Promise<string | null> {
    const file = await getImageFile(mangaId, index);
    return file ? URL.createObjectURL(file) : null;
}
