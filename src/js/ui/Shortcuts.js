import { AppState } from '../core/AppState';
import { showModal, hideModal } from '../components/Modal'; // Use Modal component
import { navigateScrubber } from '../features/ScrubberManager'; // Placeholder import
import { loadNextChapter, loadPreviousChapter, goToFirstChapter, goToLastChapter, reloadCurrentChapter } from '../features/ImageManager';
import { zoomIn, zoomOut, resetZoom } from '../features/ZoomManager';
import { toggleFullScreen, returnToHome } from './ViewerUI';
import { toggleTheme } from './ThemeManager';
import { openSettings } from '../features/SettingsManager';

// Define shortcuts
// Group by context (viewer vs global) if needed later
const shortcuts = [
    // --- Viewer Only ---
    { keys: ['ArrowRight', 'd'], action: 'Next Image', handler: () => navigateScrubber(1), viewerOnly: true },
    { keys: ['ArrowLeft', 'a'], action: 'Previous Image', handler: () => navigateScrubber(-1), viewerOnly: true },
    { keys: ['Alt+ArrowRight', 'Alt+d'], action: 'Next Chapter', handler: loadNextChapter, viewerOnly: true },
    { keys: ['Alt+ArrowLeft', 'Alt+a'], action: 'Previous Chapter', handler: loadPreviousChapter, viewerOnly: true },
    { keys: ['h'], action: 'First Chapter', handler: goToFirstChapter, viewerOnly: true },
    { keys: ['l'], action: 'Last Chapter', handler: goToLastChapter, viewerOnly: true },
    { keys: ['+', 'NumpadAdd'], action: 'Zoom In', handler: zoomIn, viewerOnly: true },
    { keys: ['-', 'NumpadSubtract'], action: 'Zoom Out', handler: zoomOut, viewerOnly: true },
    { keys: ['=', '0', 'Numpad0'], action: 'Reset Zoom', handler: resetZoom, viewerOnly: true },
    { keys: ['f'], action: 'Toggle Fullscreen', handler: toggleFullScreen, viewerOnly: true },
    { keys: ['r'], action: 'Reload Chapter', handler: reloadCurrentChapter, viewerOnly: true },

    // --- Global ---
    { keys: ['t'], action: 'Change Theme', handler: toggleTheme, viewerOnly: false },
    { keys: ['Shift+S'], action: 'Open Settings', handler: openSettings, viewerOnly: false },
    { keys: ['Escape'], action: 'Return to Home / Close Modals', handler: handleEscape, viewerOnly: false }, // Special handler for Esc
];

// --- Shortcut Handling ---

function handleKeyDown(event) {
    // 1. Ignore if typing in input/textarea or if modifier keys (except Alt/Shift for specific shortcuts) are pressed inappropriately
    const targetTagName = event.target.tagName;
    const isInputFocused = targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || targetTagName === 'SELECT';
    // Allow Alt/Shift only if they are part of the shortcut definition
    const modifierKeyPressed = event.ctrlKey || event.metaKey; // Ignore Ctrl/Cmd for now

    if (isInputFocused || modifierKeyPressed) {
        // Allow Escape even if input is focused (to close modals)
        if (event.key !== 'Escape') {
             return;
        }
    }

    // 2. Construct the key identifier (handling Alt/Shift)
    let keyIdentifier = '';
    if (event.altKey) keyIdentifier += 'Alt+';
    if (event.shiftKey) keyIdentifier += 'Shift+';
    keyIdentifier += event.key;

    // 3. Find matching shortcut
    const shortcut = shortcuts.find(sc => sc.keys.includes(keyIdentifier));

    if (shortcut) {
        // 4. Check context (viewer vs global)
        const isViewerContext = AppState.currentView === 'viewer';
        if (shortcut.viewerOnly && !isViewerContext) {
            return; // Ignore viewer shortcut if not in viewer
        }

        // 5. Execute handler and prevent default browser action
        try {
            shortcut.handler();
            event.preventDefault(); // Prevent default action (e.g., scrolling with arrows)
            // console.log(`Shortcut executed: ${shortcut.action}`); // DEBUG
        } catch (e) {
            console.error(`Error executing shortcut handler for "${shortcut.action}":`, e);
        }
    }
}

// Special handler for Escape key
function handleEscape() {
    // Check if any modal is open (needs Modal component state or query)
    const openModal = document.querySelector('#modal-container > div[role="dialog"]'); // Check if a modal backdrop exists
    if (openModal && openModal.id) {
        hideModal(openModal.id);
    } else if (AppState.currentView === 'viewer') {
        // If no modal is open and we are in the viewer, return home
        returnToHome();
    }
    // If on homepage with no modal, Escape does nothing
}


// --- Help Modal ---

export function showShortcutsHelp() {
    // Generate HTML table content for shortcuts
    let tableHtml = `
        <table class="w-full text-sm text-left text-gray-700 dark:text-gray-300">
            <thead class="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-2">Shortcut</th>
                    <th scope="col" class="px-4 py-2">Action</th>
                    <th scope="col" class="px-4 py-2">Context</th>
                </tr>
            </thead>
            <tbody>
    `;
    shortcuts.forEach(sc => {
        // Format keys nicely
        const formattedKeys = sc.keys.map(k => {
            return k.replace('ArrowRight', '→')
                    .replace('ArrowLeft', '←')
                    .replace('NumpadAdd', 'Num +')
                    .replace('NumpadSubtract', 'Num -')
                    .replace('Numpad0', 'Num 0');
        }).join(' <span class="text-gray-400 dark:text-gray-500">or</span> ');

        tableHtml += `
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td class="px-4 py-2 font-mono">${formattedKeys}</td>
                <td class="px-4 py-2">${sc.action}</td>
                <td class="px-4 py-2">${sc.viewerOnly ? 'Viewer' : 'Global'}</td>
            </tr>
        `;
    });
    tableHtml += `</tbody></table>`;
    tableHtml += `<p class="mt-4 text-xs text-gray-500 dark:text-gray-400">Note: Shortcuts generally do not work when typing in input fields (except Esc).</p>`;

    // Show shortcuts in a modal
    showModal('shortcuts-help-modal', {
        title: 'Keyboard Shortcuts',
        content: tableHtml,
        size: 'lg',
        buttons: [{ text: 'Close', type: 'primary', onClick: () => hideModal('shortcuts-help-modal') }]
    });
}

// --- Initialization ---

export function initShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
}