const Config = {
    // General constants
    DEBOUNCE_DELAY_MS: 150,

    // Other constants
    IMAGE_FILE_EXTENSIONS: ["webp", "jpg", "jpeg", "png", "gif"] as const,
    IMAGE_LOAD_CONCURRENCY: 4,
    LIGHTBOX_LONG_PRESS_DURATION_MS: 200,
    MAX_ZOOM_LIGHTBOX: 40,
    MIN_ZOOM: 0.1,
    PASSWORD: import.meta.env.VITE_PASSWORD || "",
    SIDEBAR_HOVER_DELAY_MS: 10,
    SIDEBAR_HOVER_SENSITIVITY_PX: 50,
    ZOOM_STEP: 0.05,
} as const;

export default Config;
