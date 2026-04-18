import { showModal, hideModal } from "../components/Modal";

import { shortcutMetadata } from "./ShortcutMetadata";

function formatKeyDisplay(key) {
    const keyMap = {
        ArrowRight: "→",
        ArrowLeft: "←",
        ArrowUp: "↑",
        ArrowDown: "↓",
        Escape: "ESC",
        Control: "CTRL",
        Alt: "ALT",
        Shift: "SHIFT",
    };

    return keyMap[key] || key.toUpperCase();
}

export function showShortcutsHelp() {
    const kbdClass =
        "inline-block min-w-[2.5rem] px-2 py-1 text-center font-space font-bold text-xs bg-white dark:bg-black text-black dark:text-white brutal-border brutal-shadow-sm";

    let sectionsHtml = "";

    ["Viewer", "Global"].forEach((contextType) => {
        const isViewer = contextType === "Viewer";
        const contextShortcuts = shortcutMetadata.filter((shortcut) => shortcut.viewerOnly === isViewer);
        if (contextShortcuts.length === 0) return;

        let rowsHtml = "";

        contextShortcuts.forEach((shortcut) => {
            const displayKeys = shortcut.keys.filter((key) => !key.includes("Numpad"));
            if (displayKeys.length === 0) return;

            const formattedKeys = displayKeys
                .map((key) => {
                    if (key === "+") {
                        return `<kbd class="${kbdClass}">+</kbd>`;
                    }
                    return key
                        .split("+")
                        .map((part) => `<kbd class="${kbdClass}">${formatKeyDisplay(part)}</kbd>`)
                        .join(` <span class="mx-1 font-bold text-[#FF3366]">+</span> `);
                })
                .join(` <span class="mx-2 text-black/30 dark:text-white/30 font-bold">/</span> `);

            rowsHtml += `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b-2 border-black/10 dark:border-white/10 gap-2">
                    <div class="flex flex-wrap items-center">
                        ${formattedKeys}
                    </div>
                    <div class="font-space font-bold uppercase tracking-widest text-sm text-black dark:text-white">
                        ${shortcut.action}
                    </div>
                </div>
            `;
        });

        sectionsHtml += `
            <div class="mb-10">
                <div class="bg-black dark:bg-white text-white dark:text-black px-4 py-2 inline-block mb-4 brutal-shadow-accent">
                    <h3 class="font-syne font-bold uppercase tracking-tighter text-lg">${contextType} Commands</h3>
                </div>
                <div class="flex flex-col">
                    ${rowsHtml}
                </div>
            </div>
        `;
    });

    const content = `
        <div class="p-2">
            ${sectionsHtml}
            <div class="mt-8 pt-6 border-t-4 border-black dark:border-white">
                <p class="font-space font-bold uppercase text-[10px] tracking-[0.2em] text-[#FF3366]">
                    * NOTE: Commands are disabled during active text input sequences.
                </p>
            </div>
        </div>
    `;

    showModal("shortcuts-help-modal", {
        title: "Keyboard Shortcuts",
        content,
        size: "xl",
        buttons: [{ text: "ACKNOWLEDGE", type: "primary", onClick: () => hideModal("shortcuts-help-modal") }],
    });
}
