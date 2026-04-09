import Config from "./Config";

// Store the last successful format/padding to try them first next time
let lastSuccessfulFormat = Config.IMAGE_FILE_EXTENSIONS[0];
// We define padding by "Target Length" (e.g., 0=raw, 2=01, 3=001)
let lastSuccessfulPadLength = 0;

function tryLoadImageSrc(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

export async function loadImage(basePath, index) {
    if (!basePath || typeof index !== "number" || index <= 0) {
        console.error("Invalid arguments for loadImage:", basePath, index);
        return null;
    }

    // 1. Sanitize basePath: Remove trailing slash if present to avoid double slashes //
    const cleanBasePath = basePath.endsWith("/") || basePath.endsWith("\\") ? basePath.slice(0, -1) : basePath;

    // 2. Define standard padding lengths to try (Raw, 2 digits, 3 digits, 4 digits)
    // Order: Try last successful, then 0 (raw), then 2 (01), 3 (001), etc.
    const defaultPadLengths = [0, 2, 3, 4];
    const padLengths = [lastSuccessfulPadLength, ...defaultPadLengths.filter((p) => p !== lastSuccessfulPadLength)];

    const formats = [lastSuccessfulFormat, ...Config.IMAGE_FILE_EXTENSIONS.filter((f) => f !== lastSuccessfulFormat)];

    for (const format of formats) {
        for (const targetLength of padLengths) {
            const indexStr = index.toString();

            // Logic: If target is 3, turn "1" into "001". If target is 0, keep "1".
            // If index is "10" and target is 2, it stays "10".
            const paddedIndex = targetLength > 0 ? indexStr.padStart(targetLength, "0") : indexStr;

            const imagePath = `${cleanBasePath}/${paddedIndex}.${format}`;

            try {
                const img = await tryLoadImageSrc(imagePath);

                // Success! Update cache
                lastSuccessfulFormat = format;
                lastSuccessfulPadLength = targetLength;

                img.dataset.originalWidth = img.naturalWidth;
                img.dataset.originalHeight = img.naturalHeight;

                return img;
            } catch {
                // Continue to next combination
            }
        }
    }

    console.warn(`ImageLoader: Could not find image for index ${index} at path ${cleanBasePath}`);
    return null;
}
