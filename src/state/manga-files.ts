export interface ImageDims {
    height: number;
    width: number;
}

interface MangaFileCache {
    chapterPages: Map<number, Promise<FileSystemFileHandle[]>>;
    chapters?: Promise<FileSystemDirectoryHandle[]>;
    dims: Map<string, ImageDims>;
}

const mangaCaches = new Map<string, MangaFileCache>();

function cacheFor(mangaId: string): MangaFileCache {
    let cache = mangaCaches.get(mangaId);
    if (!cache) {
        cache = { chapterPages: new Map(), dims: new Map() };
        mangaCaches.set(mangaId, cache);
    }
    return cache;
}

function dimsKey(chapterIndex: number, pageIndex: number): string {
    return `${chapterIndex}:${pageIndex}`;
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

function sortedByName<T extends FileSystemHandle>(entries: T[]): T[] {
    return entries.toSorted((a, b) => numericCollator.compare(a.name, b.name));
}

export async function scanChapterFolders(handle: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle[]> {
    const folders: FileSystemDirectoryHandle[] = [];
    for await (const entry of handle.values()) {
        if (entry.kind === "directory") folders.push(entry);
    }
    return sortedByName(folders);
}

async function scanChapterPages(handle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const files: FileSystemFileHandle[] = [];
    for await (const entry of handle.values()) {
        if (entry.kind === "file" && isImageFile(entry.name)) files.push(entry);
    }
    return sortedByName(files);
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

function getChapterHandles(mangaId: string): Promise<FileSystemDirectoryHandle[]> {
    const cache = cacheFor(mangaId);
    if (!cache.chapters) {
        cache.chapters = getAccessibleHandle(mangaId).then((handle) => {
            if (!handle) throw new Error(`No access to manga folder: ${mangaId}`);
            return scanChapterFolders(handle);
        });
        cache.chapters.catch(() => {
            cache.chapters = undefined;
        });
    }
    return cache.chapters;
}

function getChapterPageHandles(mangaId: string, chapterIndex: number): Promise<FileSystemFileHandle[]> {
    const cache = cacheFor(mangaId);
    let pages = cache.chapterPages.get(chapterIndex);
    if (!pages) {
        pages = getChapterHandles(mangaId).then((chapters) => {
            const chapterHandle = chapters[chapterIndex];
            if (!chapterHandle) throw new Error(`No chapter ${chapterIndex} for manga: ${mangaId}`);
            return scanChapterPages(chapterHandle);
        });
        pages.catch(() => {
            cache.chapterPages.delete(chapterIndex);
        });
        cache.chapterPages.set(chapterIndex, pages);
    }
    return pages;
}

export async function getMangaChapterCount(mangaId: string): Promise<number | null> {
    try {
        const chapters = await getChapterHandles(mangaId);
        return chapters.length;
    } catch {
        return null;
    }
}

export async function getChapterPageCount(mangaId: string, chapterIndex: number): Promise<number | null> {
    try {
        const pages = await getChapterPageHandles(mangaId, chapterIndex);
        return pages.length;
    } catch {
        return null;
    }
}

export function getCachedPageDimensions(mangaId: string, chapterIndex: number, pageIndex: number): ImageDims | null {
    return mangaCaches.get(mangaId)?.dims.get(dimsKey(chapterIndex, pageIndex)) ?? null;
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

async function getImageFile(mangaId: string, chapterIndex: number, pageIndex: number): Promise<File | null> {
    try {
        const files = await getChapterPageHandles(mangaId, chapterIndex);
        const fileHandle = files[pageIndex];
        if (!fileHandle) return null;
        return await fileHandle.getFile();
    } catch (error) {
        console.warn(`Failed to read image file ${chapterIndex}/${pageIndex} for manga ${mangaId}:`, error);
        return null;
    }
}

export async function loadImage(
    mangaId: string,
    chapterIndex: number,
    pageIndex: number,
): Promise<HTMLImageElement | null> {
    const file = await getImageFile(mangaId, chapterIndex, pageIndex);
    if (!file) return null;

    try {
        const img = await loadImageFromFile(file);
        if (img.naturalWidth && img.naturalHeight) {
            cacheFor(mangaId).dims.set(dimsKey(chapterIndex, pageIndex), {
                height: img.naturalHeight,
                width: img.naturalWidth,
            });
        }
        return img;
    } catch (error) {
        console.warn(`Failed to decode image ${chapterIndex}/${pageIndex} for manga ${mangaId}:`, error);
        return null;
    }
}

export async function getImageUrl(mangaId: string, chapterIndex: number, pageIndex: number): Promise<string | null> {
    const file = await getImageFile(mangaId, chapterIndex, pageIndex);
    return file ? URL.createObjectURL(file) : null;
}
