import type { ImagePattern, Manga } from "@/types";
import { PersistState, setStoredImagePattern } from "@/state";
import Config from "@/core/config";

let recentPattern: ImagePattern | null = null;
const resolvedPathPatterns = new Map<string, ImagePattern>();
const pendingPathResolutions = new Map<string, Promise<HTMLImageElement | null>>();

function tryLoadImageSrc(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", () => reject(new Error(`Failed to load image: ${src}`)));
        img.src = src;
    });
}

function normalizeBasePath(basePath: string): string {
    return basePath.endsWith("/") || basePath.endsWith("\\") ? basePath.slice(0, -1) : basePath;
}

function getAttemptOrder(preferred: ImagePattern | null): { formats: string[]; padLengths: number[] } {
    const defaultPadLengths = [0, 2, 3, 4];
    const format = preferred?.format ?? recentPattern?.format ?? Config.IMAGE_FILE_EXTENSIONS[0];
    const padLength = preferred?.padLength ?? recentPattern?.padLength ?? 0;

    return {
        formats: [format, ...Config.IMAGE_FILE_EXTENSIONS.filter((f) => f !== format)],
        padLengths: [padLength, ...defaultPadLengths.filter((p) => p !== padLength)],
    };
}

function buildImagePath(basePath: string, index: number, format: string, padLength: number): string {
    const indexStr = index.toString();
    const paddedIndex = padLength > 0 ? indexStr.padStart(padLength, "0") : indexStr;
    return `${basePath}/${paddedIndex}.${format}`;
}

function getResolvedPattern(basePath: string): ImagePattern | null {
    return resolvedPathPatterns.get(normalizeBasePath(basePath)) ?? null;
}

function seedResolvedPattern(basePath: string, pattern: ImagePattern | null | undefined): void {
    if (!basePath || !pattern?.format || typeof pattern.padLength !== "number") return;
    const normalized = normalizeBasePath(basePath);
    resolvedPathPatterns.set(normalized, pattern);
    recentPattern = pattern;
}

type PatternedManga = Pick<Manga, "id" | "imagesFullPath">;

export function primeImagePattern(manga: PatternedManga): void {
    const imagePattern = PersistState.mangaProgress[manga.id]?.imagePattern;
    if (imagePattern) seedResolvedPattern(manga.imagesFullPath, imagePattern);
}

export function persistResolvedImagePattern(manga: PatternedManga): void {
    const resolvedPattern = getResolvedPattern(manga.imagesFullPath);
    if (resolvedPattern) setStoredImagePattern(manga.id, resolvedPattern);
}

export async function loadImage(basePath: string, index: number): Promise<HTMLImageElement | null> {
    if (!basePath || index <= 0) {
        console.error("Invalid arguments for loadImage:", basePath, index);
        return null;
    }

    const cleanBasePath = normalizeBasePath(basePath);
    let failedPattern: ImagePattern | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
        const cachedPattern = resolvedPathPatterns.get(cleanBasePath);
        if (cachedPattern) {
            const imagePath = buildImagePath(cleanBasePath, index, cachedPattern.format, cachedPattern.padLength);
            try {
                return await tryLoadImageSrc(imagePath);
            } catch {
                resolvedPathPatterns.delete(cleanBasePath);
                failedPattern = cachedPattern;
            }
        }

        const pending = pendingPathResolutions.get(cleanBasePath);
        if (pending) {
            await pending;
            continue;
        }

        const discovery = (async (): Promise<HTMLImageElement | null> => {
            const { formats, padLengths } = getAttemptOrder(failedPattern);

            for (const format of formats) {
                for (const padLength of padLengths) {
                    if (failedPattern && format === failedPattern.format && padLength === failedPattern.padLength) {
                        continue;
                    }

                    const imagePath = buildImagePath(cleanBasePath, index, format, padLength);
                    try {
                        const img = await tryLoadImageSrc(imagePath);
                        const resolved: ImagePattern = { format, padLength };
                        recentPattern = resolved;
                        resolvedPathPatterns.set(cleanBasePath, resolved);
                        return img;
                    } catch {}
                }
            }
            return null;
        })();

        pendingPathResolutions.set(cleanBasePath, discovery);

        try {
            const result = await discovery;
            if (!result) {
                console.warn(`ImageLoader: Could not find image for index ${index} at path ${cleanBasePath}`);
            }
            return result;
        } finally {
            pendingPathResolutions.delete(cleanBasePath);
        }
    }

    return null;
}
