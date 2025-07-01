import { showModal, hideModal } from "../components/Modal";
import { State } from "../core/State";
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
    // Input focus check
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

    // Look up the matching shortcut
    const shortcut = shortcuts.find((sc) => sc.keys.includes(keyIdentifier));
    if (!shortcut) return;

    if (!State.isPasswordVerified && shortcut.allowBeforeVerified !== true) {
        return;
    }
    if (State.isPasswordVerified && shortcut.viewerOnly && State.currentView !== "viewer") {
        return;
    }

    shortcut.handler();
    event.preventDefault();
}

// Special handler for Escape key
function handleEscape() {
    const openModal = document.querySelector('#modal-container > div[role="dialog"]');
    if (!openModal && State.isPasswordVerified && State.currentView === "viewer") {
        returnToHome();
    }
    // Otherwise (modal open, homepage, not verified), Escape does nothing here
}

function formatKeyDisplay(key) {
    const keyMap = {
        "ArrowRight": "→",
        "ArrowLeft": "←",
        "ArrowUp": "↑",
        "ArrowDown": "↓",
        "Escape": "Esc",
        "Control": "Ctrl",
        "Alt": "Alt",
        "Shift": "Shift",
    };
    
    return keyMap[key] || key;
}

export function showShortcutsHelp() {
    const kbdClass = "px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded shadow-sm";
    let tableContent = '';
    
    ['Viewer', 'Global'].forEach(contextType => {
        const isViewer = contextType === 'Viewer';
        const contextShortcuts = shortcuts.filter(sc => sc.viewerOnly === isViewer);
        if (contextShortcuts.length === 0) return;
        
        tableContent += `
            <tr class="bg-gray-50 dark:bg-gray-700">
                <td colspan="2" class="px-4 py-2 font-medium text-gray-600 dark:text-gray-300">${contextType} Shortcuts</td>
            </tr>
        `;
        
        contextShortcuts.forEach(shortcut => {
            // Filter out Numpad keys
            const displayKeys = shortcut.keys.filter(key => !key.includes("Numpad"));
            if (displayKeys.length === 0) return;
            
            // Format keys
            const formattedKeys = displayKeys.map(key => {
                if (key === "+") {
                    return `<kbd class="${kbdClass}">+</kbd>`;
                }
                
                // Format compound keys
                return key.split('+')
                    .map(part => `<kbd class="${kbdClass}">${formatKeyDisplay(part)}</kbd>`)
                    .join(' + ');
            }).join(` <span class="text-gray-400 dark:text-gray-500 mx-1">or</span> `);
            
            tableContent += `
                <tr class="bg-white dark:bg-gray-800">
                    <td class="px-4 py-3">${formattedKeys}</td>
                    <td class="px-4 py-3">${shortcut.action}</td>
                </tr>
            `;
        });
    });
    
    const content = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse rounded-lg overflow-hidden">
                <thead class="text-xs uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                        <th scope="col" class="px-4 py-3 text-left rounded-tl-lg">Shortcut</th>
                        <th scope="col" class="px-4 py-3 text-left rounded-tr-lg">Action</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    ${tableContent}
                </tbody>
            </table>
        </div>
        <div class="mt-4 text-xs text-gray-500 dark:text-gray-400 px-1">
            <p>Note: Shortcuts generally do not work when typing in input fields (except Esc).</p>
        </div>
    `;

    showModal("shortcuts-help-modal", {
        title: "Keyboard Shortcuts",
        content: content,
        size: "xl",
        buttons: [{ text: "Close", type: "primary", onClick: () => hideModal("shortcuts-help-modal") }],
    });
}

// Initialization
export function initShortcuts() {
    document.addEventListener("keydown", handleKeyDown);
}
