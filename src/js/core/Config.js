const Config = {
    // Password hash (leave empty string "" to disable password)
    // Generate SHA256 hash for your password (e.g., using an online tool or Node.js crypto)
    PASSWORD_HASH: "", // Example: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"

    // LocalStorage keys
    LOCAL_STORAGE_KEYS: {
        theme: 'mangaViewer_theme',
        mangaList: 'mangaViewer_mangaList',
        mangaSettings: 'mangaViewer_mangaSettings',
        // Add other keys as needed
    },

    // Default settings values
    DEFAULT_SCROLL_AMOUNT: 300,
    DEFAULT_IMAGE_FIT: 'original', // 'original', 'height', 'width'
    DEFAULT_SPACING_AMOUNT: 30, // px
    DEFAULT_COLLAPSE_SPACING: false,
    DEFAULT_ZOOM_LEVEL: 1.0,
    DEFAULT_THEME: 'dark',

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