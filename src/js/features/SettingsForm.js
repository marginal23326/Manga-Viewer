import { addClass, removeClass, setAttribute, setText, toggleClass, $, $$ } from '../core/DOMUtils';
import Config from '../core/Config';

/**
 * Creates the HTML structure for the settings form tabs and content panes.
 * @returns {HTMLElement} - The container element holding the tabs and content.
 */
export function createSettingsFormElement() {
    const settingsContainer = document.createElement('div');

    // --- Tabs ---
    const tabList = document.createElement('ul');
    addClass(tabList, 'flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400 mb-4');
    tabList.setAttribute('role', 'tablist');
    tabList.id = 'settings-tabs';

    const createTab = (id, label, isActive = false, isDisabled = false) => {
        const li = document.createElement('li');
        addClass(li, 'me-2');
        li.setAttribute('role', 'presentation');

        const button = document.createElement('button');
        button.id = `${id}-tab`;
        addClass(button, 'inline-block p-3 rounded-t-lg');
        setAttribute(button, 'type', 'button');
        setAttribute(button, 'role', 'tab');
        setAttribute(button, 'aria-controls', id);
        setAttribute(button, 'aria-selected', isActive ? 'true' : 'false');

        if (isDisabled) {
            addClass(button, 'cursor-not-allowed opacity-50');
            setAttribute(button, 'disabled', 'true');
            addClass(button, 'text-gray-400 dark:text-gray-500');
        } else {
            addClass(button, 'hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300');
            if (isActive) {
                addClass(button, 'text-blue-600 bg-gray-100 dark:bg-gray-800 dark:text-blue-500');
            }
        }
        setText(button, label);

        // The 'disabled' attribute will prevent it from firing when needed.
        button.addEventListener('click', () => switchSettingsTab(id));

        li.appendChild(button);
        return li;
    };

    tabList.appendChild(createTab('settings-general', 'General', true)); // General is active by default
    tabList.appendChild(createTab('settings-manga-details', 'Manga Details', false, true)); // Disabled initially
    tabList.appendChild(createTab('settings-navigation', 'Navigation', false, true)); // Disabled initially
    tabList.appendChild(createTab('settings-display', 'Display', false, true)); // Disabled initially

    // --- Tab Content Panes ---
    const tabContent = document.createElement('div');
    tabContent.id = 'settings-tab-content';

    const createTabPane = (id, isActive = false) => {
        const pane = document.createElement('div');
        pane.id = id;
        addClass(pane, 'p-1 rounded-lg bg-gray-50 dark:bg-gray-800');
        if (!isActive) addClass(pane, 'hidden');
        setAttribute(pane, 'role', 'tabpanel');
        setAttribute(pane, 'aria-labelledby', `${id}-tab`);
        return pane;
    };

    // General Pane
    const generalPane = createTabPane('settings-general', true);
    generalPane.innerHTML = `
        <div class="mb-4">
            <label for="theme-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Theme</label>
            <select id="theme-select" name="theme" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </div>
        <div>
            <button type="button" id="shortcuts-help-button" class="btn btn-secondary">View Shortcuts</button>
        </div>
    `; // Shortcuts button added

    // Manga Details Pane (will be populated by MangaForm)
    const mangaDetailsPane = createTabPane('settings-manga-details');
    // Add a placeholder or leave empty, MangaForm will be injected here

    // Navigation Pane
    const navigationPane = createTabPane('settings-navigation');
    navigationPane.innerHTML = `
        <div class="mb-4">
            <label for="scroll-amount-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scroll Amount (px)</label>
            <input type="number" id="scroll-amount-input" name="scrollAmount" min="50" step="50" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Pixels to scroll when clicking top/bottom image halves.</p>
        </div>
    `;

    // Display Pane
    const displayPane = createTabPane('settings-display');
    displayPane.innerHTML = `
        <div class="mb-4">
            <label for="image-fit-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Fit</label>
            <select id="image-fit-select" name="imageFit" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="original">Original Size</option>
                <option value="width">Fit Width</option>
                <option value="height">Fit Height</option>
            </select>
        </div>
        <div class="mb-4">
            <label for="spacing-amount-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image Spacing (px)</label>
            <input type="number" id="spacing-amount-input" name="spacingAmount" min="0" step="1" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
        </div>
        <div class="flex items-center">
            <input id="collapse-spacing-checkbox" name="collapseSpacing" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600">
            <label for="collapse-spacing-checkbox" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">Collapse Spacing (Set to 0px)</label>
        </div>
    `;

    tabContent.appendChild(generalPane);
    tabContent.appendChild(mangaDetailsPane);
    tabContent.appendChild(navigationPane);
    tabContent.appendChild(displayPane);

    // --- Assemble ---
    settingsContainer.appendChild(tabList);
    settingsContainer.appendChild(tabContent);

    return settingsContainer;
}

/**
 * Handles switching between settings tabs.
 * @param {string} targetTabId - The ID of the tab pane to show.
 */
function switchSettingsTab(targetTabId) {
    const tabContainer = document.getElementById('settings-tabs');
    const contentContainer = document.getElementById('settings-tab-content');
    if (!tabContainer || !contentContainer) return;

    const activeClasses = 'text-blue-600 bg-gray-100 dark:bg-gray-800 dark:text-blue-500';
    const inactiveHoverClasses = 'hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300';

    // Update button states
    $$('button[role="tab"]', tabContainer).forEach(button => {
        const isTarget = button.getAttribute('aria-controls') === targetTabId;
        setAttribute(button, 'aria-selected', isTarget ? 'true' : 'false');

        if (isTarget) {
            addClass(button, activeClasses);
            removeClass(button, inactiveHoverClasses);
        } else {
            removeClass(button, activeClasses);
            // Only add hover classes if the button is not disabled
            if (!button.disabled) {
                addClass(button, inactiveHoverClasses);
            } else {
                 // Ensure hover classes are removed if button is disabled but not target
                 removeClass(button, inactiveHoverClasses);
            }
        }
    });

    // Update pane visibility (using toggleClass with single class 'hidden' is fine)
    $$('div[role="tabpanel"]', contentContainer).forEach(pane => {
        toggleClass(pane, 'hidden', pane.id !== targetTabId);
    });
}

/**
 * Enables or disables settings tabs that require a manga to be loaded.
 * @param {boolean} enable - True to enable, false to disable.
 */
export function toggleMangaSettingsTabs(enable) {
    const tabContainer = document.getElementById('settings-tabs');
    if (!tabContainer) return;

    const mangaTabIds = [
        'settings-manga-details-tab',
        'settings-navigation-tab',
        'settings-display-tab'
    ];
    const disabledClasses = 'cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500';
    const enabledHoverClasses = 'hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300';
    const activeClasses = 'text-blue-600 bg-gray-100 dark:bg-gray-800 dark:text-blue-500'; // Need this to remove active state if disabling

    mangaTabIds.forEach(tabId => {
        const button = document.getElementById(tabId);
        if (button) {
            button.disabled = !enable;

            if (enable) {
                // Enable Button
                removeClass(button, disabledClasses);
                addClass(button, enabledHoverClasses);
                removeClass(button, activeClasses); // Ensure not active initially
            } else {
                // Disable Button
                addClass(button, disabledClasses);
                removeClass(button, enabledHoverClasses);
                removeClass(button, activeClasses); // Ensure not active when disabled
            }
        }
    });

    // If disabling, switch back to the General tab if a disabled tab was active
    if (!enable) {
        const activeTab = $('button[aria-selected="true"]', tabContainer);
        if (activeTab && mangaTabIds.includes(activeTab.id)) {
            switchSettingsTab('settings-general');
        }
    }
}
