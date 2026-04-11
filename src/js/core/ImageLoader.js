import Config from "./Config";

// Store the last successful format/padding to try them first next time
let lastSuccessfulFormat = Config.IMAGE_FILE_EXTENSIONS[0];
// We define padding by "Target Length" (e.g., 0=raw, 2=01, 3=001)
let lastSuccessfulPadLength = 0;
const resolvedPathPatterns = new Map();
const pendingPathResolutions = new Map();

function tryLoadImageSrc(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

function normalizeBasePath(basePath) {
    return basePath.endsWith("/") || basePath.endsWith("\\") ? basePath.slice(0, -1) : basePath;
}

function getAttemptOrder(preferredPattern = null) {
    const defaultPadLengths = [0, 2, 3, 4];
    const preferredPadLength = preferredPattern?.padLength ?? lastSuccessfulPadLength;
    const preferredFormat = preferredPattern?.format ?? lastSuccessfulFormat;

    return {
        padLengths: [preferredPadLength, ...defaultPadLengths.filter((padLength) => padLength !== preferredPadLength)],
        formats: [preferredFormat, ...Config.IMAGE_FILE_EXTENSIONS.filter((format) => format !== preferredFormat)],
    };
}

function buildImagePath(basePath, index, format, padLength) {
    const indexStr = index.toString();
    const paddedIndex = padLength > 0 ? indexStr.padStart(padLength, "0") : indexStr;
    return `${basePath}/${paddedIndex}.${format}`;
}

function finalizeLoadedImage(img) {
    img.dataset.originalWidth = img.naturalWidth;
    img.dataset.originalHeight = img.naturalHeight;
    return img;
}

async function resolvePathPattern(basePath, probeIndex) {
    const cachedPattern = resolvedPathPatterns.get(basePath);
    if (cachedPattern) {
        return cachedPattern;
    }

    const pendingResolution = pendingPathResolutions.get(basePath);
    if (pendingResolution) {
        return pendingResolution;
    }

    const resolutionPromise = (async () => {
        const { formats, padLengths } = getAttemptOrder();

        for (const format of formats) {
            for (const padLength of padLengths) {
                const imagePath = buildImagePath(basePath, probeIndex, format, padLength);

                try {
                    await tryLoadImageSrc(imagePath);

                    const resolvedPattern = { format, padLength };
                    lastSuccessfulFormat = format;
                    lastSuccessfulPadLength = padLength;
                    resolvedPathPatterns.set(basePath, resolvedPattern);

                    return resolvedPattern;
                } catch {
                    // Continue to next combination
                }
            }
        }

        return null;
    })();

    pendingPathResolutions.set(basePath, resolutionPromise);

    try {
        return await resolutionPromise;
    } finally {
        pendingPathResolutions.delete(basePath);
    }
}

async function tryLoadUsingPattern(basePath, index, pattern) {
    const imagePath = buildImagePath(basePath, index, pattern.format, pattern.padLength);
    const img = await tryLoadImageSrc(imagePath);

    lastSuccessfulFormat = pattern.format;
    lastSuccessfulPadLength = pattern.padLength;
    resolvedPathPatterns.set(basePath, pattern);

    return finalizeLoadedImage(img);
}

async function bruteForceLoad(basePath, index, preferredPattern = null) {
    const { formats, padLengths } = getAttemptOrder(preferredPattern);

    for (const format of formats) {
        for (const padLength of padLengths) {
            const imagePath = buildImagePath(basePath, index, format, padLength);

            try {
                const img = await tryLoadImageSrc(imagePath);

                lastSuccessfulFormat = format;
                lastSuccessfulPadLength = padLength;
                resolvedPathPatterns.set(basePath, { format, padLength });

                return finalizeLoadedImage(img);
            } catch {
                // Continue to next combination
            }
        }
    }

    return null;
}

export async function loadImage(basePath, index) {
    if (!basePath || typeof index !== "number" || index <= 0) {
        console.error("Invalid arguments for loadImage:", basePath, index);
        return null;
    }

    const cleanBasePath = normalizeBasePath(basePath);
    const resolvedPattern = resolvedPathPatterns.get(cleanBasePath) ?? (await resolvePathPattern(cleanBasePath, index));

    if (resolvedPattern) {
        try {
            return await tryLoadUsingPattern(cleanBasePath, index, resolvedPattern);
        } catch {
            resolvedPathPatterns.delete(cleanBasePath);
        }
    }

    const fallbackImage = await bruteForceLoad(cleanBasePath, index, resolvedPattern);
    if (fallbackImage) {
        return fallbackImage;
    }

    console.warn(`ImageLoader: Could not find image for index ${index} at path ${cleanBasePath}`);
    return null;
}
