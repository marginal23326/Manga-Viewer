import { hideModal, showModal } from "../components/modal";
import { h } from "../core/dom-utils";

import { shortcutMetadata } from "./shortcut-metadata";

const KBD_CLASS =
    "inline-block min-w-[2.5rem] px-2 py-1 text-center font-space font-bold text-xs bg-white dark:bg-black text-black dark:text-white brutal-border brutal-shadow-sm";

function formatKeyDisplay(key) {
    const keyMap = {
        Alt: "ALT",
        ArrowDown: "↓",
        ArrowLeft: "←",
        ArrowRight: "→",
        ArrowUp: "↑",
        Control: "CTRL",
        Escape: "ESC",
        Shift: "SHIFT",
    };

    return keyMap[key] || key.toUpperCase();
}

function createKbd(text) {
    return h("kbd", { className: KBD_CLASS }, text);
}

function createFormattedKeys(displayKeys) {
    const wrapper = h("div", { className: "flex flex-wrap items-center" });

    displayKeys.forEach((key, index) => {
        if (index > 0) {
            wrapper.append(h("span", { className: "mx-2 text-black/30 dark:text-white/30 font-bold" }, "/"));
        }

        if (key === "+") {
            wrapper.append(createKbd("+"));
            return;
        }

        key.split("+").forEach((part, partIndex) => {
            if (partIndex > 0) {
                wrapper.append(h("span", { className: "mx-1 font-bold text-[#FF3366]" }, "+"));
            }
            wrapper.append(createKbd(formatKeyDisplay(part)));
        });
    });

    return wrapper;
}

function createShortcutRow(shortcut) {
    const displayKeys = shortcut.keys.filter((key) => !key.includes("Numpad"));
    if (displayKeys.length === 0) return null;

    return h(
        "div",
        {
            className:
                "flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b-2 border-black/10 dark:border-white/10 gap-2",
        },
        createFormattedKeys(displayKeys),
        h(
            "div",
            { className: "font-space font-bold uppercase tracking-widest text-sm text-black dark:text-white" },
            shortcut.action,
        ),
    );
}

function createSection(contextType) {
    const isViewer = contextType === "Viewer";
    const contextShortcuts = shortcutMetadata.filter((shortcut) => shortcut.viewerOnly === isViewer);
    if (contextShortcuts.length === 0) return null;

    const rows = contextShortcuts.map((shortcut) => createShortcutRow(shortcut)).filter(Boolean);

    return h(
        "div",
        { className: "mb-10" },
        h(
            "div",
            {
                className:
                    "bg-black dark:bg-white text-white dark:text-black px-4 py-2 inline-block mb-4 brutal-shadow-accent",
            },
            h("h3", { className: "font-syne font-bold uppercase tracking-tighter text-lg" }, `${contextType} Commands`),
        ),
        h("div", { className: "flex flex-col" }, rows),
    );
}

export function showShortcutsHelp() {
    const sections = ["Viewer", "Global"].map((contextType) => createSection(contextType)).filter(Boolean);

    const content = h(
        "div",
        { className: "p-2" },
        sections,
        h(
            "div",
            { className: "mt-8 pt-6 border-t-4 border-black dark:border-white" },
            h(
                "p",
                { className: "font-space font-bold uppercase text-[10px] tracking-[0.2em] text-[#FF3366]" },
                "* NOTE: Commands are disabled during active text input sequences.",
            ),
        ),
    );

    showModal("shortcuts-help-modal", {
        buttons: [{ onClick: () => hideModal("shortcuts-help-modal"), text: "ACKNOWLEDGE", type: "primary" }],
        content,
        size: "xl",
        title: "Keyboard Shortcuts",
    });
}
