import {
    addClass,
    setAttribute,
    setText,
    toggleClass,
    $,
    $$,
    setDataAttribute,
    getDataAttribute,
} from "../core/DOMUtils";

const TAB_BUTTON_ACTIVE_CLASSES = "text-blue-600 bg-gray-100 dark:bg-gray-800 dark:text-blue-500";
const TAB_BUTTON_INACTIVE_HOVER_CLASSES = "hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300";
const TAB_BUTTON_DISABLED_CLASSES = "cursor-not-allowed opacity-50 text-gray-400 dark:text-gray-500";
const LABEL_CLASSES = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const NUMBER_INPUT_CLASSES = "block w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * Creates the HTML structure for the settings form tabs and content panes.
 * @returns {HTMLElement} - The container element holding the tabs and content.
 */
export function createSettingsFormElement() {
    const settingsContainer = document.createElement("div");

    // --- Tabs ---
    const tabList = document.createElement("ul");
    addClass(tabList, "flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400 mb-4",);
    tabList.id = "settings-tabs";

    const createTab = (id, label, isActive = false, isDisabled = false) => {
        const li = document.createElement("li");
        addClass(li, "me-2");

        const button = document.createElement("button");
        button.id = `${id}-tab`;
        addClass(button, "inline-block p-3 rounded-t-lg");
        setAttribute(button, { type: "button", "data-tab-button": "true" });
        setDataAttribute(button, "controls", id);
        setDataAttribute(button, "selected", isActive ? "true" : "false");

        if (isDisabled) {
            addClass(button, TAB_BUTTON_DISABLED_CLASSES);
            setAttribute(button, { disabled: "true" });
        } else {
            addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
            if (isActive) {
                addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
            }
        }
        setText(button, label);

        button.addEventListener("click", () => switchSettingsTab(id));

        li.appendChild(button);
        return li;
    };

    tabList.appendChild(createTab("settings-general", "General", true));
    tabList.appendChild(createTab("settings-manga-details", "Manga Details", false, true));
    tabList.appendChild(createTab("settings-navigation", "Navigation", false, true));
    tabList.appendChild(createTab("settings-display", "Display", false, true));

    // --- Tab Content Panes ---
    const tabContent = document.createElement("div");
    tabContent.id = "settings-tab-content";

    const createTabPane = (id, isActive = false) => {
        const pane = document.createElement("div");
        pane.id = id;
        addClass(pane, "p-1 rounded-lg bg-gray-50 dark:bg-gray-800");
        if (!isActive) addClass(pane, "hidden");
        setAttribute(pane, { "data-tab-panel": "true" });
        return pane;
    };

    // General Pane
    const generalPane = createTabPane("settings-general", true);
    generalPane.innerHTML = `
        <div class="mb-8 min-h-40">
            <div class="mb-4">
                <label class="${LABEL_CLASSES}">Theme</label>
                <div id="theme-buttons-placeholder"></div>
            </div>
            <div class="flex space-x-2">
                <button type="button" id="shortcuts-help-button" class="btn btn-secondary">View Shortcuts</button>
                <button type="button" id="reset-settings-button" class="btn btn-danger">Reset All Settings</button>
            </div>
        </div>
    `;

    // Manga Details Pane
    const mangaDetailsPane = createTabPane("settings-manga-details");

    // Navigation Pane
    const navigationPane = createTabPane("settings-navigation");
    navigationPane.innerHTML = `
        <div class="mb-4">
            <label for="scroll-amount-input" class="${LABEL_CLASSES}">Manual Scroll (px)</label>
            <input type="number" id="scroll-amount-input" name="scrollAmount" min="50" step="50" class="${NUMBER_INPUT_CLASSES}">
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Pixels to scroll when clicking top/bottom image halves.</p>
        </div>
        <div class="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
            <h4 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Auto Scroll</h4>
            <div class="space-y-4">
                <label for="enable-auto-scroll-checkbox" class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="enable-auto-scroll-checkbox" name="autoScrollEnabled" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Enable Auto Scroll</span>
                </label>
                <div id="auto-scroll-options">
                    <label for="auto-scroll-speed-input" class="${LABEL_CLASSES}">Scroll Speed (px/sec)</label>
                    <input type="number" id="auto-scroll-speed-input" name="autoScrollSpeed" min="10" step="10" class="${NUMBER_INPUT_CLASSES}">
                </div>
            </div>
        </div>
    `;

    // Display Pane
    const displayPane = createTabPane("settings-display");
    displayPane.innerHTML = `
        <div class="flex space-x-4 mb-4">
            <div>
                <label class="${LABEL_CLASSES}">Image Fit</label>
                <div id="image-fit-select-placeholder"></div>
            </div>
            <div>
                <label for="spacing-amount-input" class="${LABEL_CLASSES}">Image Spacing (px)</label>
                <input type="number" id="spacing-amount-input" name="spacingAmount" min="0" step="1" class="${NUMBER_INPUT_CLASSES}">
            </div>
        </div>
        <label for="collapse-spacing-checkbox" class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="collapse-spacing-checkbox" name="collapseSpacing" class="sr-only peer">
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Collapse Spacing (Set to 0px)</span>
        </label>
        <div class="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
            <h4 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Progress Bar</h4>
            <div class="space-y-4">
                <label for="enable-progress-bar-checkbox" class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="enable-progress-bar-checkbox" name="progressBarEnabled" class="sr-only peer">
                    <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    <span class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Enable Progress Bar</span>
                </label>
                <div class="flex space-x-4">
                    <div class="progress-bar-option flex-1">
                        <label class="${LABEL_CLASSES}">Position</label>
                        <div id="progress-bar-position-select-placeholder"></div>
                    </div>
                    <div class="progress-bar-option flex-1">
                        <label class="${LABEL_CLASSES}">Style</label>
                        <div id="progress-bar-style-select-placeholder"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    tabContent.appendChild(generalPane);
    tabContent.appendChild(mangaDetailsPane);
    tabContent.appendChild(navigationPane);
    tabContent.appendChild(displayPane);

    // --- Assemble ---
    settingsContainer.appendChild(tabList);
    settingsContainer.appendChild(tabContent);

    settingsContainer._themeButtons = null;
    settingsContainer._imageFitSelect = null;

    return settingsContainer;
}

/**
 * Handles switching between settings tabs.
 * @param {string} targetTabId - The ID of the tab pane to show.
 */
export function switchSettingsTab(targetTabId) {
    const tabContainer = document.getElementById("settings-tabs");
    const contentContainer = document.getElementById("settings-tab-content");
    if (!tabContainer || !contentContainer) return;

    $$("button[data-tab-button]", tabContainer).forEach((button) => {
        const isTarget = getDataAttribute(button, "controls") === targetTabId;
        setDataAttribute(button, "selected", isTarget ? "true" : "false");

        toggleClass(button, TAB_BUTTON_ACTIVE_CLASSES, isTarget);
        toggleClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES, !isTarget && !button.disabled);
    });

    $$("div[data-tab-panel]", contentContainer).forEach((pane) => {
        toggleClass(pane, "hidden", pane.id !== targetTabId);
    });
}

/**
 * Enables or disables settings tabs that require a manga to be loaded.
 * @param {boolean} enable - True to enable, false to disable.
 */
export function toggleMangaSettingsTabs(enable) {
    const tabContainer = document.getElementById("settings-tabs");
    if (!tabContainer) return;

    const mangaTabIds = ["settings-manga-details-tab", "settings-navigation-tab", "settings-display-tab"];

    mangaTabIds.forEach((tabId) => {
        const button = document.getElementById(tabId);
        if (button) {
            button.disabled = !enable;

            toggleClass(button, TAB_BUTTON_DISABLED_CLASSES, !enable);
            toggleClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES, enable);
        }
    });

    if (!enable) {
        const activeTab = $('button[data-selected="true"]', tabContainer);
        if (activeTab && mangaTabIds.includes(activeTab.id)) {
            switchSettingsTab("settings-general");
        }
    }
}
