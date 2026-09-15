import { deleteStoredHandles, getAccessibleHandle, saveStoredHandle } from "./manga-handles";

export { pickMangaFolder } from "./manga-handles";

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
const urlCache = new Map<string, Promise<string | null>>();

function cacheFor(mangaId: string): MangaFileCache {
    let cache = mangaCaches.get(mangaId);
    if (!cache) {
        cache = { chapterPages: new Map(), dims: new Map() };
        mangaCaches.set(mangaId, cache);
    }
    return cache;
}

export function invalidateMangaCache(mangaId: string): void {
    for (const [key, promise] of urlCache) {
        if (key.startsWith(`${mangaId}:`)) {
            urlCache.delete(key);
            void promise.then((url) => {
                if (url) URL.revokeObjectURL(url);
            });
        }
    }
    mangaCaches.delete(mangaId);
}

function dimsKey(chapterIndex: number, pageIndex: number): string {
    return `${chapterIndex}:${pageIndex}`;
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

export async function adoptMangaFolder(mangaId: string, handle: FileSystemDirectoryHandle): Promise<void> {
    invalidateMangaCache(mangaId);
    await saveStoredHandle(mangaId, handle);
}

export async function forgetMangaFolders(mangaIds: readonly string[]): Promise<void> {
    for (const id of mangaIds) invalidateMangaCache(id);
    await deleteStoredHandles(mangaIds);
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

async function lengthOrNull(handles: Promise<unknown[]>): Promise<number | null> {
    try {
        const resolved = await handles;
        return resolved.length;
    } catch {
        return null;
    }
}

export function getMangaChapterCount(mangaId: string): Promise<number | null> {
    return lengthOrNull(getChapterHandles(mangaId));
}

export function getChapterPageCount(mangaId: string, chapterIndex: number): Promise<number | null> {
    return lengthOrNull(getChapterPageHandles(mangaId, chapterIndex));
}

export function getCachedPageDimensions(mangaId: string, chapterIndex: number, pageIndex: number): ImageDims | null {
    return mangaCaches.get(mangaId)?.dims.get(dimsKey(chapterIndex, pageIndex)) ?? null;
}

export function getImageUrl(mangaId: string, chapterIndex: number, pageIndex: number): Promise<string | null> {
    const key = `${mangaId}:${chapterIndex}:${pageIndex}`;
    const existing = urlCache.get(key);
    if (existing) return existing;

    const promise = getImageFile(mangaId, chapterIndex, pageIndex).then((file) => {
        if (!file) {
            urlCache.delete(key);
            return null;
        }
        return URL.createObjectURL(file);
    });

    urlCache.set(key, promise);
    return promise;
}

export async function loadImage(
    mangaId: string,
    chapterIndex: number,
    pageIndex: number,
): Promise<HTMLImageElement | null> {
    const url = await getImageUrl(mangaId, chapterIndex, pageIndex);
    if (!url) return null;

    return new Promise((resolve) => {
        const img = new Image();
        img.addEventListener("load", () => {
            if (img.naturalWidth && img.naturalHeight) {
                cacheFor(mangaId).dims.set(dimsKey(chapterIndex, pageIndex), {
                    height: img.naturalHeight,
                    width: img.naturalWidth,
                });
            }
            resolve(img);
        });
        img.addEventListener("error", () => resolve(null));
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
