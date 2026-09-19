import { deleteStoredHandles, getAccessibleHandle, saveStoredHandle } from "./manga-handles";
import type { ChapterRef } from "@/types";

export { pickMangaFolder } from "./manga-handles";

export interface ImageDims {
    height: number;
    width: number;
}

interface MangaFileCache {
    chapterPages: Map<number, Promise<FileSystemFileHandle[]>>;
    chapters?: Promise<FileSystemDirectoryHandle[]>;
    dims: Map<string, ImageDims>;
    urls: Map<string, Promise<string | null>>;
}

const IMAGE_URL_CACHE_SIZE = 300;
const mangaCaches = new Map<string, MangaFileCache>();

function revokeUrlPromise(promise: Promise<string | null>): void {
    void promise.then((url) => {
        if (url) URL.revokeObjectURL(url);
    });
}

function cacheFor(mangaId: string): MangaFileCache {
    let cache = mangaCaches.get(mangaId);
    if (!cache) {
        cache = { chapterPages: new Map(), dims: new Map(), urls: new Map() };
        mangaCaches.set(mangaId, cache);
    }
    return cache;
}

export function invalidateMangaCache(mangaId: string): void {
    const cache = mangaCaches.get(mangaId);
    if (!cache) return;

    for (const promise of cache.urls.values()) revokeUrlPromise(promise);
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

function getChapterPageHandles(ref: ChapterRef): Promise<FileSystemFileHandle[]> {
    const cache = cacheFor(ref.mangaId);
    let pages = cache.chapterPages.get(ref.chapterIndex);
    if (!pages) {
        pages = getChapterHandles(ref.mangaId).then((chapters) => {
            const chapterHandle = chapters[ref.chapterIndex];
            if (!chapterHandle) throw new Error(`No chapter ${ref.chapterIndex} for manga: ${ref.mangaId}`);
            return scanChapterPages(chapterHandle);
        });
        pages.catch(() => {
            cache.chapterPages.delete(ref.chapterIndex);
        });
        cache.chapterPages.set(ref.chapterIndex, pages);
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

export function getChapterPageCount(ref: ChapterRef): Promise<number | null> {
    return lengthOrNull(getChapterPageHandles(ref));
}

export function getCachedPageDimensions(ref: ChapterRef, pageIndex: number): ImageDims | null {
    return mangaCaches.get(ref.mangaId)?.dims.get(dimsKey(ref.chapterIndex, pageIndex)) ?? null;
}

export function getImageUrl(ref: ChapterRef, pageIndex: number): Promise<string | null> {
    const cache = cacheFor(ref.mangaId);
    const key = dimsKey(ref.chapterIndex, pageIndex);
    const existing = cache.urls.get(key);
    if (existing) {
        cache.urls.delete(key);
        cache.urls.set(key, existing);
        return existing;
    }

    const promise = getImageFile(ref, pageIndex).then((file) => {
        if (!file) {
            cache.urls.delete(key);
            return null;
        }
        return URL.createObjectURL(file);
    });

    cache.urls.set(key, promise);
    if (cache.urls.size > IMAGE_URL_CACHE_SIZE) {
        const oldestKey = cache.urls.keys().next().value;
        if (oldestKey !== undefined) {
            const oldest = cache.urls.get(oldestKey);
            cache.urls.delete(oldestKey);
            if (oldest) revokeUrlPromise(oldest);
        }
    }
    return promise;
}

export async function loadImage(ref: ChapterRef, pageIndex: number): Promise<HTMLImageElement | null> {
    const url = await getImageUrl(ref, pageIndex);
    if (!url) return null;

    return new Promise((resolve) => {
        const img = new Image();
        img.addEventListener("load", () => {
            if (img.naturalWidth && img.naturalHeight) {
                cacheFor(ref.mangaId).dims.set(dimsKey(ref.chapterIndex, pageIndex), {
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

async function getImageFile(ref: ChapterRef, pageIndex: number): Promise<File | null> {
    try {
        const files = await getChapterPageHandles(ref);
        const fileHandle = files[pageIndex];
        if (!fileHandle) return null;
        return await fileHandle.getFile();
    } catch (error) {
        console.warn(`Failed to read image file ${ref.chapterIndex}/${pageIndex} for manga ${ref.mangaId}:`, error);
        return null;
    }
}
