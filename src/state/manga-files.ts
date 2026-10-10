import { deleteStoredHandles, getAccessibleHandle, saveStoredHandle } from "./manga-handles";
import type { ChapterRef } from "@/types";

export interface ImageDims {
    height: number;
    width: number;
}

interface MangaFileCache {
    chapterPages: Map<number, Promise<FileSystemFileHandle[] | null>>;
    chapters: Map<"all", Promise<FileSystemDirectoryHandle[] | null>>;
    dims: Map<string, ImageDims>;
    urls: Map<string, Promise<string | null>>;
}

const IMAGE_URL_CACHE_SIZE = 300;
const mangaCaches = new Map<string, MangaFileCache>();

function remember<K, V>(cache: Map<K, Promise<V | null>>, key: K, load: () => Promise<V | null>): Promise<V | null> {
    let promise = cache.get(key);
    if (!promise) {
        promise = load().catch((error: unknown) => {
            console.warn("Failed to read manga files:", error);
            return null;
        });
        cache.set(key, promise);
        void promise.then((value) => {
            if (value === null) cache.delete(key);
        });
    }
    return promise;
}

function revokeUrlPromise(promise: Promise<string | null>): void {
    void promise.then((url) => {
        if (url) URL.revokeObjectURL(url);
    });
}

function cacheFor(mangaId: string): MangaFileCache {
    let cache = mangaCaches.get(mangaId);
    if (!cache) {
        cache = { chapterPages: new Map(), chapters: new Map(), dims: new Map(), urls: new Map() };
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

function pageKey(chapterIndex: number, pageIndex: number): string {
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
    for await (const entry of handle.values()) if (entry.kind === "directory") folders.push(entry);
    return sortedByName(folders);
}

async function scanChapterPages(handle: FileSystemDirectoryHandle): Promise<FileSystemFileHandle[]> {
    const files: FileSystemFileHandle[] = [];
    for await (const entry of handle.values()) if (entry.kind === "file" && isImageFile(entry.name)) files.push(entry);
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

function getChapterHandles(mangaId: string): Promise<FileSystemDirectoryHandle[] | null> {
    return remember(cacheFor(mangaId).chapters, "all", async () => {
        const handle = await getAccessibleHandle(mangaId);
        return handle && scanChapterFolders(handle);
    });
}

function getChapterPageHandles(ref: ChapterRef): Promise<FileSystemFileHandle[] | null> {
    return remember(cacheFor(ref.mangaId).chapterPages, ref.chapterIndex, async () => {
        const chapters = await getChapterHandles(ref.mangaId);
        const chapter = chapters?.[ref.chapterIndex];
        return chapter ? scanChapterPages(chapter) : null;
    });
}

export function getMangaChapterCount(mangaId: string): Promise<number | null> {
    return getChapterHandles(mangaId).then((chapters) => chapters?.length ?? null);
}

export function getChapterPageCount(ref: ChapterRef): Promise<number | null> {
    return getChapterPageHandles(ref).then((pages) => pages?.length ?? null);
}

export function getCachedPageDimensions(ref: ChapterRef, pageIndex: number): ImageDims | null {
    return mangaCaches.get(ref.mangaId)?.dims.get(pageKey(ref.chapterIndex, pageIndex)) ?? null;
}

export function cachePageDimensions(ref: ChapterRef, pageIndex: number, dims: ImageDims): void {
    cacheFor(ref.mangaId).dims.set(pageKey(ref.chapterIndex, pageIndex), dims);
}

export function getImageUrl(ref: ChapterRef, pageIndex: number): Promise<string | null> {
    const { urls } = cacheFor(ref.mangaId);
    const key = pageKey(ref.chapterIndex, pageIndex);
    const promise = remember(urls, key, async () => {
        const pages = await getChapterPageHandles(ref);
        const file = await pages?.[pageIndex]?.getFile();
        return file ? URL.createObjectURL(file) : null;
    });

    urls.delete(key);
    urls.set(key, promise);
    for (const [oldestKey, oldest] of urls) {
        if (urls.size <= IMAGE_URL_CACHE_SIZE) break;
        urls.delete(oldestKey);
        revokeUrlPromise(oldest);
    }
    return promise;
}
