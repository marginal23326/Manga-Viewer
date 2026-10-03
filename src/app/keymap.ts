interface ShortcutDefinition {
    action: string;
    anywhere?: boolean;
    id: string;
    keys: readonly [string, ...string[]];
    lightbox?: boolean;
}

const DEFINITIONS = [
    { action: "Next image", id: "nextImage", keys: ["ArrowRight", "KeyD"], lightbox: true },
    { action: "Previous image", id: "previousImage", keys: ["ArrowLeft", "KeyA"], lightbox: true },
    { action: "Next chapter", id: "nextChapter", keys: ["Alt+ArrowRight", "Alt+KeyD"] },
    { action: "Previous chapter", id: "previousChapter", keys: ["Alt+ArrowLeft", "Alt+KeyA"] },
    { action: "First chapter", id: "firstChapter", keys: ["KeyH"] },
    { action: "Last chapter", id: "lastChapter", keys: ["KeyL"] },
    { action: "Zoom in", id: "zoomIn", keys: ["Shift+Equal", "NumpadAdd"] },
    { action: "Zoom out", id: "zoomOut", keys: ["Minus", "NumpadSubtract"] },
    { action: "Reset zoom", id: "resetZoom", keys: ["Equal"] },
    { action: "Toggle fullscreen", id: "toggleFullscreen", keys: ["KeyF"] },
    { action: "Reload manga", id: "reloadManga", keys: ["KeyR"] },
    { action: "Toggle auto scroll", id: "toggleAutoScroll", keys: ["KeyS"] },
    { action: "Change theme", anywhere: true, id: "toggleTheme", keys: ["KeyT"] },
    { action: "Open settings", anywhere: true, id: "openSettings", keys: ["Shift+KeyS"] },
    { action: "Back to library / close dialogs", anywhere: true, id: "escape", keys: ["Escape"] },
    { action: "Keep toolbar visible", id: "toggleToolbarPin", keys: ["Ctrl+KeyB"] },
] as const satisfies readonly ShortcutDefinition[];

export type ShortcutId = (typeof DEFINITIONS)[number]["id"];
export type Shortcut = ShortcutDefinition & { id: ShortcutId };

export const SHORTCUTS: readonly Shortcut[] = DEFINITIONS;

const shortcutByKey = new Map<string, Shortcut>();
for (const shortcut of SHORTCUTS) {
    for (const key of shortcut.keys) shortcutByKey.set(key, shortcut);
}

export function matchShortcut(event: KeyboardEvent): Shortcut | undefined {
    const modifiers = `${event.ctrlKey || event.metaKey ? "Ctrl+" : ""}${event.altKey ? "Alt+" : ""}${event.shiftKey ? "Shift+" : ""}`;
    return shortcutByKey.get(modifiers + event.code);
}

const KEY_LABELS: Record<string, string> = {
    Alt: "Alt",
    ArrowLeft: "←",
    ArrowRight: "→",
    Ctrl: "Ctrl",
    Equal: "=",
    Escape: "Esc",
    Minus: "-",
    Shift: "Shift",
};

export function formatKeyPart(part: string): string {
    return KEY_LABELS[part] ?? (/^Key[A-Z]$/u.test(part) ? part.slice(3) : part.toUpperCase());
}

export function withShortcutHint(label: string, id: ShortcutId): string {
    const key = SHORTCUTS.find((shortcut) => shortcut.id === id)?.keys[0] ?? "";
    return `${label} (${key
        .split("+")
        .map((part) => formatKeyPart(part))
        .join("+")})`;
}
