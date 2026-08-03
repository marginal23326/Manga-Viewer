const Config = {
    // General constants
    DEBOUNCE_DELAY_MS: 150,

    // Default settings values
    DEFAULT_AUTO_SCROLL_ENABLED: false,
    DEFAULT_AUTO_SCROLL_SPEED_PX_PER_SECOND: 50,
    DEFAULT_COLLAPSE_SPACING: false,
    // 'original', 'height', 'width'
    DEFAULT_IMAGE_FIT: "original",
    DEFAULT_NAV_BAR_ENABLED: true,
    DEFAULT_PROGRESS_BAR_ENABLED: true,
    // 'top' or 'bottom'
    DEFAULT_PROGRESS_BAR_POSITION: "bottom",
    // 'continuous' or 'discrete'
    DEFAULT_PROGRESS_BAR_STYLE: "discrete",
    DEFAULT_SCROLL_AMOUNT: 300,
    DEFAULT_SCRUBBER_ENABLED: true,
    DEFAULT_SPACING_AMOUNT_PX: 30,
    DEFAULT_ZOOM_LEVEL: 1,

    // Other constants
    IMAGE_FILE_EXTENSIONS: ["webp", "jpg", "jpeg", "png", "gif"],
    LIGHTBOX_LONG_PRESS_DURATION_MS: 200,
    MAX_ZOOM_LIGHTBOX: 40,
    MIN_ZOOM: 0.1,
    PASSWORD: import.meta.env.VITE_PASSWORD || "",
    SIDEBAR_HOVER_DELAY_MS: 10,
    SIDEBAR_HOVER_SENSITIVITY_PX: 50,
    ZOOM_STEP: 0.05,
};

export default Config;
