const Config = {
    // Password hash (leave empty string "" to disable password)
    // Generate SHA256 hash for your password using: https://emn178.github.io/online-tools/sha256.html
    PASSWORD_HASH: "",

    // LocalStorage keys
    LOCAL_STORAGE_KEYS: {
        themePreference: "themePreference",
        mangaList: "mangaList",
        mangaSettings: "mangaSettings",
        currentView: "currentView",
        currentManga: "currentManga",
        sidebarMode: "sidebarMode",
        mangaSortOrder: "mangaSortOrder",
        // Add other keys as needed
    },

    // Default settings values
    DEFAULT_SCROLL_AMOUNT: 300,
    DEFAULT_IMAGE_FIT: "original", // 'original', 'height', 'width'
    DEFAULT_SPACING_AMOUNT: 30, // px
    DEFAULT_COLLAPSE_SPACING: false,
    DEFAULT_ZOOM_LEVEL: 1.0,
    DEFAULT_PROGRESS_BAR_ENABLED: true,
    DEFAULT_PROGRESS_BAR_POSITION: "bottom", // 'top' or 'bottom'
    DEFAULT_PROGRESS_BAR_STYLE: "discrete", // 'continuous' or 'discrete'

    // Other constants
    IMAGE_FILE_EXTENSIONS: ["webp", "jpg", "jpeg", "png", "gif"],
    IMAGE_PADDING_PATTERNS: ["", "0", "00"], // For image number formatting (1, 01, 001)
    LIGHTBOX_LONG_PRESS_DURATION: 200, // ms
    DEBOUNCE_DELAY: 150, // ms for debouncing scroll/resize events
    NAV_HIDE_DELAY: 1500, // ms after chapter load
    SIDEBAR_HOVER_DELAY: 10, // ms delay before opening
    SIDEBAR_HOVER_SENSITIVITY: 50, // pixels from left edge
    ZOOM_STEP: 0.05,
    MIN_ZOOM: 0.1,
    MAX_ZOOM_LIGHTBOX: 40,
};

export default Config;
