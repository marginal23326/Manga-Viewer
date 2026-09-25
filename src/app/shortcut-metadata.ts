export interface ShortcutDefinition {
    action: string;
    id: string;
    keys: readonly string[];
    viewerOnly: boolean;
}

interface ShortcutInput extends Omit<ShortcutDefinition, "viewerOnly"> {
    viewerOnly?: boolean;
}

const rawShortcutMetadata = [
    { action: "Next image", id: "nextImage", keys: ["ArrowRight", "KeyD"] },
    { action: "Previous image", id: "previousImage", keys: ["ArrowLeft", "KeyA"] },
    { action: "Next chapter", id: "nextChapter", keys: ["Alt+ArrowRight", "Alt+KeyD"] },
    { action: "Previous chapter", id: "previousChapter", keys: ["Alt+ArrowLeft", "Alt+KeyA"] },
    { action: "First chapter", id: "firstChapter", keys: ["KeyH"] },
    { action: "Last chapter", id: "lastChapter", keys: ["KeyL"] },
    { action: "Zoom in", id: "zoomIn", keys: ["Shift+Equal", "NumpadAdd"] },
    { action: "Zoom out", id: "zoomOut", keys: ["Minus", "NumpadSubtract"] },
    { action: "Reset zoom", id: "resetZoom", keys: ["Equal", "Digit0", "Numpad0"] },
    { action: "Toggle fullscreen", id: "toggleFullscreen", keys: ["KeyF"] },
    { action: "Reload manga", id: "reloadManga", keys: ["KeyR"] },
    { action: "Toggle auto scroll", id: "toggleAutoScroll", keys: ["KeyS"] },
    { action: "Change theme", id: "toggleTheme", keys: ["KeyT"], viewerOnly: false },
    { action: "Open settings", id: "openSettings", keys: ["Shift+KeyS"], viewerOnly: false },
    { action: "Return to home / close modals", id: "escape", keys: ["Escape"], viewerOnly: false },
    { action: "Pin/unpin sidebar", id: "toggleSidebarPin", keys: ["Ctrl+KeyB"] },
] as const satisfies readonly ShortcutInput[];

export const shortcutMetadata = rawShortcutMetadata.map((shortcut) => ({ viewerOnly: true, ...shortcut }));

export type ShortcutId = (typeof shortcutMetadata)[number]["id"];
