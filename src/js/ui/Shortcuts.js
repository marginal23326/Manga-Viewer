import { AppState } from '../core/AppState';
import { showModal, hideModal } from '../components/Modal';
import { navigateScrubber } from '../features/ScrubberManager';
import { loadNextChapter, loadPreviousChapter, goToFirstChapter, goToLastChapter, reloadCurrentChapter } from '../features/ImageManager';
import { zoomIn, zoomOut, resetZoom } from '../features/ZoomManager';
import { toggleFullScreen, returnToHome } from './ViewerUI';
import { toggleTheme } from './ThemeManager';
import { openSettings } from '../features/SettingsManager';
import { toggleSidebarState } from '../features/SidebarManager';

// Define shortcuts
const shortcuts = [
    // Viewer Only
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

    // Global
    { keys: ['t'], action: 'Change Theme', handler: toggleTheme, viewerOnly: false, allowBeforeVerified: true },
    { keys: ['Shift+S'], action: 'Open Settings', handler: openSettings, viewerOnly: false },
    { keys: ['Escape'], action: 'Return to Home / Close Modals', handler: handleEscape, viewerOnly: false, allowBeforeVerified: true },
    { keys: ['b'], action: 'Toggle Sidebar', handler: toggleSidebarState, viewerOnly: false },
];

// Shortcut Handling

function handleKeyDown(event) {
    // 1. Input focus check
    const targetTagName = event.target.tagName;
    const isInputFocused = targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || targetTagName === 'SELECT';
    const modifierKeyPressed = event.ctrlKey || event.metaKey;

    if (isInputFocused) {
        if (event.key === 'Escape') {
            // Allow Escape
        } else {
            return;
        }
    } else if (modifierKeyPressed) {
        return;
    }

    // 2. Key identifier
    let keyIdentifier = '';
    if (event.altKey) keyIdentifier += 'Alt+';
    if (event.shiftKey) keyIdentifier += 'Shift+';
    keyIdentifier += event.key;

    // 3. Find shortcut
    const shortcut = shortcuts.find(sc => sc.keys.includes(keyIdentifier));

    if (shortcut) {
        if (!AppState.isPasswordVerified && shortcut.allowBeforeVerified !== true) {
            return;
        }

        if (AppState.isPasswordVerified) {
            const isViewerContext = AppState.currentView === 'viewer';
            if (shortcut.viewerOnly && !isViewerContext) {
                return;
            }
        }

        // 5. Execute handler
        try {
            shortcut.handler();
            event.preventDefault();
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
        if (openModal.id === 'password-entry-modal') {
            return;
        }
        hideModal(openModal.id);
    } else if (AppState.isPasswordVerified && AppState.currentView === 'viewer') {
        // Only return home if password verified and in viewer
        returnToHome();
    }
    // If on homepage or password not verified (and no other modal open), Escape does nothing
}


// Help Modal

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

        let contextText = sc.viewerOnly ? 'Viewer' : 'Global';
        if (sc.allowBeforeVerified === true) {
            contextText += ' (Always)';
        }

        tableHtml += `
            <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td class="px-4 py-2 font-mono">${formattedKeys}</td>
                <td class="px-4 py-2">${sc.action}</td>
                <td class="px-4 py-2">${contextText}</td>
            </tr>
        `;
    });
    tableHtml += `</tbody></table>`;
    tableHtml += `<p class="mt-4 text-xs text-gray-500 dark:text-gray-400">Note: Shortcuts generally do not work when typing in input fields (except Esc).</p>`;

    showModal('shortcuts-help-modal', {
        title: 'Keyboard Shortcuts',
        content: tableHtml,
        size: 'lg',
        buttons: [{ text: 'Close', type: 'primary', onClick: () => hideModal('shortcuts-help-modal') }]
    });
}

// Initialization

export function initShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
}