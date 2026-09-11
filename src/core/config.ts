const Config = {
    DEBOUNCE_DELAY_MS: 150,
    IMAGE_LOAD_CONCURRENCY: 4,
    PASSWORD: import.meta.env.VITE_PASSWORD || "",
} as const;

export default Config;
