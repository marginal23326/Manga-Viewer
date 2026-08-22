import type { ImagePattern, Manga } from "@/types";
import { getStoredImagePattern, setStoredImagePattern } from "@/state";
import Config from "@/core/config";

let lastSuccessfulFormat: string = Config.IMAGE_FILE_EXTENSIONS[0];
let lastSuccessfulPadLength = 0;
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

interface AttemptOrder {
    formats: string[];
    padLengths: number[];
}

function getAttemptOrder(preferredPattern: ImagePattern | null = null): AttemptOrder {
    const defaultPadLengths = [0, 2, 3, 4];
    const preferredPadLength = preferredPattern?.padLength ?? lastSuccessfulPadLength;
    const preferredFormat = preferredPattern?.format ?? lastSuccessfulFormat;

    return {
        formats: [preferredFormat, ...Config.IMAGE_FILE_EXTENSIONS.filter((format) => format !== preferredFormat)],
        padLengths: [preferredPadLength, ...defaultPadLengths.filter((pad) => pad !== preferredPadLength)],
    };
}

function buildImagePath(basePath: string, index: number, format: string, padLength: number): string {
    const indexStr = index.toString();
    const paddedIndex = padLength > 0 ? indexStr.padStart(padLength, "0") : indexStr;
    return `${basePath}/${paddedIndex}.${format}`;
}

function finalizeLoadedImage(img: HTMLImageElement): HTMLImageElement {
    img.dataset.originalWidth = String(img.naturalWidth);
    img.dataset.originalHeight = String(img.naturalHeight);
    return img;
}

function getResolvedPattern(basePath: string): ImagePattern | null {
    return resolvedPathPatterns.get(normalizeBasePath(basePath)) ?? null;
}

function seedResolvedPattern(basePath: string, pattern: ImagePattern | null | undefined): void {
    if (!basePath || !pattern?.format || typeof pattern.padLength !== "number") return;
    resolvedPathPatterns.set(normalizeBasePath(basePath), pattern);
    lastSuccessfulFormat = pattern.format;
    lastSuccessfulPadLength = pattern.padLength;
}

type PatternedManga = Pick<Manga, "id" | "imagesFullPath">;

export function primeImagePattern(manga: PatternedManga): void {
    const imagePattern = getStoredImagePattern(manga.id);
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
    const cachedPattern = resolvedPathPatterns.get(cleanBasePath);

    if (cachedPattern) {
        const imagePath = buildImagePath(cleanBasePath, index, cachedPattern.format, cachedPattern.padLength);
        try {
            const img = await tryLoadImageSrc(imagePath);
            return finalizeLoadedImage(img);
        } catch {
            resolvedPathPatterns.delete(cleanBasePath);
        }
    }

    const activeProbe = pendingPathResolutions.get(cleanBasePath);
    if (activeProbe) {
        await activeProbe;
        return loadImage(basePath, index);
    }

    const probePromise = (async (): Promise<HTMLImageElement | null> => {
        const { formats, padLengths } = getAttemptOrder(cachedPattern);

        for (const format of formats) {
            for (const padLength of padLengths) {
                if (cachedPattern && format === cachedPattern.format && padLength === cachedPattern.padLength) {
                    continue;
                }

                const imagePath = buildImagePath(cleanBasePath, index, format, padLength);

                try {
                    const img = await tryLoadImageSrc(imagePath);

                    lastSuccessfulFormat = format;
                    lastSuccessfulPadLength = padLength;
                    resolvedPathPatterns.set(cleanBasePath, { format, padLength });

                    return finalizeLoadedImage(img);
                } catch {}
            }
        }
        return null;
    })();

    pendingPathResolutions.set(cleanBasePath, probePromise);

    try {
        const result = await probePromise;
        if (!result) {
            console.warn(`ImageLoader: Could not find image for index ${index} at path ${cleanBasePath}`);
        }
        return result;
    } finally {
        pendingPathResolutions.delete(cleanBasePath);
    }
}
