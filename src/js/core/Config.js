const Config = {
    // Password hash (leave empty string "" to disable password)
    // Generate SHA256 hash for your password (e.g., using an online tool or command line)
    PASSWORD_HASH: "",

    // LocalStorage keys
    LOCAL_STORAGE_KEYS: {
        themePreference: 'themePreference',
        mangaList: 'mangaList',
        mangaSettings: 'mangaSettings',
        currentView: 'currentView',
        currentManga: 'currentManga',
        // Add other keys as needed
    },

    // Default settings values
    DEFAULT_SCROLL_AMOUNT: 300,
    DEFAULT_IMAGE_FIT: 'original', // 'original', 'height', 'width'
    DEFAULT_SPACING_AMOUNT: 30, // px
    DEFAULT_COLLAPSE_SPACING: false,
    DEFAULT_ZOOM_LEVEL: 1.0,

    // Other constants
    IMAGE_FILE_EXTENSIONS: ["webp", "jpg", "jpeg", "png", "gif"],
    IMAGE_PADDING_PATTERNS: ["", "0", "00"], // For image number formatting (1, 01, 001)
    LIGHTBOX_LONG_PRESS_DURATION: 200, // ms
    DEBOUNCE_DELAY: 150, // ms for debouncing scroll/resize events
    SCRUBBER_HIDE_DELAY: 500, // ms
    NAV_HIDE_DELAY: 1500, // ms after chapter load
    ZOOM_STEP: 0.05,
    MIN_ZOOM: 0.1,
    MAX_ZOOM_LIGHTBOX: 40,
};

export default Config;