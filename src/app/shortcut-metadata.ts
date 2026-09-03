export interface ShortcutDefinition {
    action: string;
    allowBeforeVerified?: boolean;
    id: string;
    keys: readonly string[];
    viewerOnly: boolean;
}

export const shortcutMetadata = [
    { action: "Next image", id: "nextImage", keys: ["ArrowRight", "d"], viewerOnly: true },
    { action: "Previous image", id: "previousImage", keys: ["ArrowLeft", "a"], viewerOnly: true },
    { action: "Next chapter", id: "nextChapter", keys: ["Alt+ArrowRight", "Alt+d"], viewerOnly: true },
    { action: "Previous chapter", id: "previousChapter", keys: ["Alt+ArrowLeft", "Alt+a"], viewerOnly: true },
    { action: "First chapter", id: "firstChapter", keys: ["h"], viewerOnly: true },
    { action: "Last chapter", id: "lastChapter", keys: ["l"], viewerOnly: true },
    { action: "Zoom in", id: "zoomIn", keys: ["+", "NumpadAdd"], viewerOnly: true },
    { action: "Zoom out", id: "zoomOut", keys: ["-", "NumpadSubtract"], viewerOnly: true },
    { action: "Reset zoom", id: "resetZoom", keys: ["=", "0", "Numpad0"], viewerOnly: true },
    { action: "Toggle fullscreen", id: "toggleFullscreen", keys: ["f"], viewerOnly: true },
    { action: "Reload chapter", id: "reloadChapter", keys: ["r"], viewerOnly: true },
    { action: "Toggle auto scroll", id: "toggleAutoScroll", keys: ["s"], viewerOnly: true },
    {
        action: "Change theme",
        allowBeforeVerified: true,
        id: "toggleTheme",
        keys: ["t"],
        viewerOnly: false,
    },
    { action: "Open settings", id: "openSettings", keys: ["Shift+S"], viewerOnly: false },
    { action: "Return to home / close modals", id: "escape", keys: ["Escape"], viewerOnly: false },
    { action: "Pin/unpin sidebar", id: "toggleSidebarPin", keys: ["Ctrl+b"], viewerOnly: true },
] as const satisfies readonly ShortcutDefinition[];

export type ShortcutId = (typeof shortcutMetadata)[number]["id"];
