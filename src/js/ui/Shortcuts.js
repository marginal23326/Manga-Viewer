import { showModal, hideModal } from "../components/Modal";
import { PersistState, UIState } from "../core/State";
import { toggleAutoScroll as toggleAutoScrollFeature } from "../features/AutoScroll";
import {
    loadNextChapter,
    loadPreviousChapter,
    goToFirstChapter,
    goToLastChapter,
    reloadCurrentChapter,
    navigateImage,
} from "../features/ImageManager";
import { openSettings } from "../features/SettingsManager";
import { cycleSidebarMode } from "../features/SidebarManager";
import { zoomIn, zoomOut, resetZoom } from "../features/ZoomManager";

import { toggleTheme } from "./ThemeManager";
import { toggleFullScreen, returnToHome } from "./ViewerUI";

// Define shortcuts
const shortcuts = [
    // Viewer Only
    { keys: ["ArrowRight", "d"], action: "Next Image", handler: () => navigateImage(1), viewerOnly: true },
    { keys: ["ArrowLeft", "a"], action: "Previous Image", handler: () => navigateImage(-1), viewerOnly: true },
    { keys: ["Alt+ArrowRight", "Alt+d"], action: "Next Chapter", handler: loadNextChapter, viewerOnly: true },
    { keys: ["Alt+ArrowLeft", "Alt+a"], action: "Previous Chapter", handler: loadPreviousChapter, viewerOnly: true },
    { keys: ["h"], action: "First Chapter", handler: goToFirstChapter, viewerOnly: true },
    { keys: ["l"], action: "Last Chapter", handler: goToLastChapter, viewerOnly: true },
    { keys: ["+", "NumpadAdd"], action: "Zoom In", handler: zoomIn, viewerOnly: true },
    { keys: ["-", "NumpadSubtract"], action: "Zoom Out", handler: zoomOut, viewerOnly: true },
    { keys: ["=", "0", "Numpad0"], action: "Reset Zoom", handler: resetZoom, viewerOnly: true },
    { keys: ["f"], action: "Toggle Fullscreen", handler: toggleFullScreen, viewerOnly: true },
    { keys: ["r"], action: "Reload Chapter", handler: reloadCurrentChapter, viewerOnly: true },
    { keys: ["s"], action: "Toggle Auto Scroll", handler: toggleAutoScrollFeature, viewerOnly: true },

    // Global
    { keys: ["t"], action: "Change Theme", handler: toggleTheme, viewerOnly: false, allowBeforeVerified: true },
    { keys: ["Shift+S"], action: "Open Settings", handler: openSettings, viewerOnly: false },
    { keys: ["Escape"], action: "Return to Home / Close Modals", handler: handleEscape, viewerOnly: false },
    { keys: ["Ctrl+b"], action: "Cycle Sidebar Mode", handler: cycleSidebarMode, viewerOnly: false },
];

// Shortcut Handling
function handleKeyDown(event) {
    const targetTagName = event.target.tagName;
    const isInputFocused = targetTagName === "INPUT" || targetTagName === "TEXTAREA" || targetTagName === "SELECT";

    if (isInputFocused && event.key !== "Escape") {
        return;
    }

    let keyIdentifier = "";
    if (event.ctrlKey || event.metaKey) keyIdentifier += "Ctrl+";
    if (event.altKey) keyIdentifier += "Alt+";
    if (event.shiftKey) keyIdentifier += "Shift+";
    keyIdentifier += event.key;

    const shortcut = shortcuts.find((sc) => sc.keys.includes(keyIdentifier));
    if (!shortcut) return;

    if (!UIState.isPasswordVerified && shortcut.allowBeforeVerified !== true) {
        return;
    }
    if (UIState.isPasswordVerified && shortcut.viewerOnly && PersistState.currentView !== "viewer") {
        return;
    }

    shortcut.handler();
    event.preventDefault();
}

function handleEscape() {
    const openModal = document.querySelector('#modal-container > div[role="dialog"]');
    if (!openModal && UIState.isPasswordVerified && PersistState.currentView === "viewer") {
        returnToHome();
    }
}

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
    // Brutalist Keyboard Key Styling
    const kbdClass =
        "inline-block min-w-[2.5rem] px-2 py-1 text-center font-space font-bold text-xs bg-white dark:bg-black text-black dark:text-white border-2 border-black dark:border-white shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]";

    let sectionsHtml = "";

    ["Viewer", "Global"].forEach((contextType) => {
        const isViewer = contextType === "Viewer";
        const contextShortcuts = shortcuts.filter((sc) => sc.viewerOnly === isViewer);
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
                <div class="bg-black dark:bg-white text-white dark:text-black px-4 py-2 inline-block mb-4 shadow-[4px_4px_0_0_#FF3366]">
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
        content: content,
        size: "xl",
        buttons: [{ text: "ACKNOWLEDGE", type: "primary", onClick: () => hideModal("shortcuts-help-modal") }],
    });
}

export function initShortcuts() {
    document.addEventListener("keydown", handleKeyDown);
}
