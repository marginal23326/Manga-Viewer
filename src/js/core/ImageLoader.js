import Config from './Config';

// Store the last successful format/padding to try them first next time
let lastSuccessfulFormat = Config.IMAGE_FILE_EXTENSIONS[0]; // Start with webp or first in list
let lastSuccessfulPadding = Config.IMAGE_PADDING_PATTERNS[0]; // Start with no padding

// Function to attempt loading a single image source
function tryLoadImageSrc(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        // Consider network errors, 404s, etc. as load failures
        img.onerror = (err) => reject(new Error(`Failed to load image: ${src}`));
        img.src = src;
    });
}

/**
 * Loads a manga image by trying different extensions and padding.
 * @param {string} basePath - The base path to the manga chapter folder (e.g., "C:\Manga\Series\Chapter1").
 * @param {number} index - The 1-based index of the image to load.
 * @returns {Promise<HTMLImageElement|null>} A promise that resolves with the loaded image element or null if not found.
 */
export async function loadImage(basePath, index) {
    if (!basePath || typeof index !== 'number' || index <= 0) {
        console.error("Invalid arguments for loadImage:", basePath, index);
        return null;
    }

    // Prioritize last successful format and padding
    const formats = [
        lastSuccessfulFormat,
        ...Config.IMAGE_FILE_EXTENSIONS.filter(f => f !== lastSuccessfulFormat)
    ];
    const paddings = [
        lastSuccessfulPadding,
        ...Config.IMAGE_PADDING_PATTERNS.filter(p => p !== lastSuccessfulPadding)
    ];

    // Iterate through formats and padding patterns
    for (const format of formats) {
        for (const padding of paddings) {
            // Ensure index is a string for padStart
            const indexStr = index.toString();
            // Calculate required length: 1 (for the digit itself) + padding length
            const requiredLength = padding.length > 0 ? indexStr.length + padding.length : indexStr.length;
            // Pad the start of the index string
            const paddedIndex = indexStr.padStart(requiredLength, padding.charAt(0) || '0'); // Use first char of padding or '0'

            // Construct the full image path
            // IMPORTANT: Handle path separators carefully. Assuming '\' for Windows paths based on original example.
            // If paths might use '/', adjust accordingly or normalize.
            const imagePath = `${basePath}\\${paddedIndex}.${format}`; // Use backslash for Windows paths

            try {
                // console.log(`Trying path: ${imagePath}`); // DEBUG
                const img = await tryLoadImageSrc(imagePath);

                // Success! Update cache and return the image
                lastSuccessfulFormat = format;
                lastSuccessfulPadding = padding;

                // Store original dimensions on the image element for later use (e.g., zooming)
                img.dataset.originalWidth = img.naturalWidth;
                img.dataset.originalHeight = img.naturalHeight;

                return img;
            } catch (error) {
                // Log failure lightly, continue trying other formats/paddings
                // console.warn(error.message); // DEBUG
            }
        }
    }

    // If all combinations failed
    console.warn(`ImageLoader: Could not find image for index ${index} at path ${basePath} with any supported format/padding.`);
    return null; // Indicate failure
}