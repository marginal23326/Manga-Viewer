export interface ShortcutDefinition {
    action: string;
    allowBeforeVerified?: boolean;
    id: string;
    keys: readonly string[];
    viewerOnly: boolean;
}

export const shortcutMetadata = [
    { action: "Next Image", id: "nextImage", keys: ["ArrowRight", "d"], viewerOnly: true },
    { action: "Previous Image", id: "previousImage", keys: ["ArrowLeft", "a"], viewerOnly: true },
    { action: "Next Chapter", id: "nextChapter", keys: ["Alt+ArrowRight", "Alt+d"], viewerOnly: true },
    { action: "Previous Chapter", id: "previousChapter", keys: ["Alt+ArrowLeft", "Alt+a"], viewerOnly: true },
    { action: "First Chapter", id: "firstChapter", keys: ["h"], viewerOnly: true },
    { action: "Last Chapter", id: "lastChapter", keys: ["l"], viewerOnly: true },
    { action: "Zoom In", id: "zoomIn", keys: ["+", "NumpadAdd"], viewerOnly: true },
    { action: "Zoom Out", id: "zoomOut", keys: ["-", "NumpadSubtract"], viewerOnly: true },
    { action: "Reset Zoom", id: "resetZoom", keys: ["=", "0", "Numpad0"], viewerOnly: true },
    { action: "Toggle Fullscreen", id: "toggleFullscreen", keys: ["f"], viewerOnly: true },
    { action: "Reload Chapter", id: "reloadChapter", keys: ["r"], viewerOnly: true },
    { action: "Toggle Auto Scroll", id: "toggleAutoScroll", keys: ["s"], viewerOnly: true },
    {
        action: "Change Theme",
        allowBeforeVerified: true,
        id: "toggleTheme",
        keys: ["t"],
        viewerOnly: false,
    },
    { action: "Open Settings", id: "openSettings", keys: ["Shift+S"], viewerOnly: false },
    { action: "Return to Home / Close Modals", id: "escape", keys: ["Escape"], viewerOnly: false },
    { action: "Cycle Sidebar Mode", id: "cycleSidebarMode", keys: ["Ctrl+b"], viewerOnly: false },
] as const satisfies readonly ShortcutDefinition[];

export type ShortcutId = (typeof shortcutMetadata)[number]["id"];
