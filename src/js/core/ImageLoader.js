import Config from "./Config";

let lastSuccessfulFormat = Config.IMAGE_FILE_EXTENSIONS[0];
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
        padLengths: [preferredPadLength, ...defaultPadLengths.filter((p) => p !== preferredPadLength)],
        formats: [preferredFormat, ...Config.IMAGE_FILE_EXTENSIONS.filter((f) => f !== preferredFormat)],
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

export async function loadImage(basePath, index) {
    if (!basePath || typeof index !== "number" || index <= 0) {
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

    const probePromise = (async () => {
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
