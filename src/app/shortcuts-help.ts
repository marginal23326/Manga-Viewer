import { type ShortcutDefinition, shortcutMetadata } from "./shortcut-metadata";
import { hideModal, showModal } from "@/components/modal";
import { h } from "@/core/dom-utils";

const KBD_CLASS = "chip";

const KEY_DISPLAY_MAP: Record<string, string> = {
    Alt: "Alt",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    Control: "Ctrl",
    Escape: "Esc",
    Shift: "Shift",
};

function formatKeyDisplay(key: string): string {
    return KEY_DISPLAY_MAP[key] ?? key.toUpperCase();
}

function createKbd(text: string): HTMLElement {
    return h("kbd", { className: KBD_CLASS }, text);
}

function createFormattedKeys(displayKeys: string[]): HTMLDivElement {
    const wrapper = h("div", { className: "flex flex-wrap items-center gap-1" });

    displayKeys.forEach((key, index) => {
        if (index > 0) {
            wrapper.append(h("span", { className: "mx-1 text-ink/25 dark:text-paper/25 text-xs" }, "or"));
        }

        if (key === "+") {
            wrapper.append(createKbd("+"));
            return;
        }

        key.split("+").forEach((part, partIndex) => {
            if (partIndex > 0) {
                wrapper.append(h("span", { className: "text-ink/30 dark:text-paper/25 text-xs" }, "+"));
            }
            wrapper.append(createKbd(formatKeyDisplay(part)));
        });
    });

    return wrapper;
}

function createShortcutRow(shortcut: ShortcutDefinition): HTMLDivElement | null {
    const displayKeys = shortcut.keys.filter((key) => !key.includes("Numpad"));
    if (displayKeys.length === 0) return null;

    return h(
        "div",
        {
            className:
                "flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b divider-line last:border-b-0 gap-2",
        },
        h("div", { className: "text-sm text-ink/75 dark:text-paper/70" }, shortcut.action),
        createFormattedKeys(displayKeys),
    );
}

function createSection(contextType: "Global" | "Viewer"): HTMLDivElement | null {
    const isViewer = contextType === "Viewer";
    const contextShortcuts = shortcutMetadata.filter((shortcut) => shortcut.viewerOnly === isViewer);
    if (contextShortcuts.length === 0) return null;

    const rows = contextShortcuts
        .map((shortcut) => createShortcutRow(shortcut))
        .filter((row): row is HTMLDivElement => row !== null);

    return h(
        "div",
        { className: "mb-8" },
        h("h3", { className: "eyebrow mb-1" }, `${contextType} commands`),
        h("div", { className: "flex flex-col" }, rows),
    );
}

export function showShortcutsHelp(): void {
    const sections = (["Viewer", "Global"] as const)
        .map((contextType) => createSection(contextType))
        .filter((section): section is HTMLDivElement => section !== null);

    const content = h(
        "div",
        {},
        sections,
        h(
            "p",
            { className: "mt-6 pt-5 border-t divider-line text-xs text-ink/40 dark:text-paper/35" },
            "Shortcuts are disabled while typing in a text field.",
        ),
    );

    showModal("shortcuts-help-modal", {
        buttons: [{ onClick: () => hideModal("shortcuts-help-modal"), text: "Got it", type: "primary" }],
        content,
        size: "xl",
        title: "Keyboard shortcuts",
    });
}
