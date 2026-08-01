const Config = {
    PASSWORD: import.meta.env.VITE_PASSWORD || "",

    PERSISTED_KEYS: [
        "themePreference",
        "mangaList",
        "mangaSettings",
        "currentView",
        "currentMangaId",
        "sidebarMode",
        "mangaSortOrder",
    ],

    // Default settings values
    DEFAULT_SCROLL_AMOUNT: 300,
    // 'original', 'height', 'width'
    DEFAULT_IMAGE_FIT: "original",
    DEFAULT_SPACING_AMOUNT_PX: 30,
    DEFAULT_COLLAPSE_SPACING: false,
    DEFAULT_ZOOM_LEVEL: 1,
    DEFAULT_PROGRESS_BAR_ENABLED: true,
    // 'top' or 'bottom'
    DEFAULT_PROGRESS_BAR_POSITION: "bottom",
    // 'continuous' or 'discrete'
    DEFAULT_PROGRESS_BAR_STYLE: "discrete",
    DEFAULT_AUTO_SCROLL_ENABLED: false,
    DEFAULT_AUTO_SCROLL_SPEED_PX_PER_SECOND: 50,
    DEFAULT_SCRUBBER_ENABLED: true,
    DEFAULT_NAV_BAR_ENABLED: true,

    // Other constants
    IMAGE_FILE_EXTENSIONS: ["webp", "jpg", "jpeg", "png", "gif"],
    LIGHTBOX_LONG_PRESS_DURATION_MS: 200,
    DEBOUNCE_DELAY_MS: 150,
    SIDEBAR_HOVER_DELAY_MS: 10,
    SIDEBAR_HOVER_SENSITIVITY_PX: 50,
    ZOOM_STEP: 0.05,
    MIN_ZOOM: 0.1,
    MAX_ZOOM_LIGHTBOX: 40,
};

export default Config;
