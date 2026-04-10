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

const TAB_BUTTON_ACTIVE_CLASSES =
    "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[4px_4px_0_0_#FF3366] translate-y-[-2px] translate-x-[-2px]";
const TAB_BUTTON_INACTIVE_HOVER_CLASSES =
    "hover:bg-[#FF3366] hover:text-white hover:border-[#FF3366] text-black dark:text-white border-transparent";
const TAB_BUTTON_DISABLED_CLASSES = "cursor-not-allowed opacity-30 text-gray-400 dark:text-gray-500 border-transparent";

// Label and Input Classes
const LABEL_CLASSES = "block text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white mb-2";
const NUMBER_INPUT_CLASSES =
    "block w-32 px-4 py-2 border-2 border-black dark:border-white shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff] rounded-none focus:outline-none focus:ring-0 focus:border-[#FF3366] dark:focus:border-[#FF3366] focus:shadow-[4px_4px_0_0_#FF3366] bg-[#f4f4f0] dark:bg-[#0a0a0a] text-black dark:text-white font-space font-bold transition-all duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed";

// Brutalist Toggle Switch structure
const createBrutalistToggle = (id, name, labelText) => `
    <label for="${id}" class="relative inline-flex items-center cursor-pointer group">
        <input type="checkbox" id="${id}" name="${name}" class="sr-only peer">
        <div class="w-12 h-6 bg-[#f4f4f0] dark:bg-[#0a0a0a] border-2 border-black dark:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF3366] peer-focus:ring-offset-2 dark:peer-focus:ring-offset-[#0a0a0a] peer-checked:bg-[#FF3366] peer-checked:border-[#FF3366] transition-colors relative after:content-[''] after:absolute after:-top-[2px] after:-left-[2px] after:bg-black dark:after:bg-white after:border-2 after:border-black dark:after:border-white after:w-6 after:h-6 after:transition-transform peer-checked:after:translate-x-6 peer-checked:after:bg-white peer-checked:after:border-black"></div>
        <span class="ml-4 text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white group-hover:text-[#FF3366] transition-colors">${labelText}</span>
    </label>
`;

/**
 * Creates the HTML structure for the settings form tabs and content panes.
 */
export function createSettingsFormElement() {
    const settingsContainer = document.createElement("div");

    // --- Tabs ---
    const tabList = document.createElement("ul");
    // Thick border under the tabs to ground them
    addClass(
        tabList,
        "flex flex-nowrap text-sm font-space font-bold tracking-widest border-b-4 border-black dark:border-white mb-6 gap-2 overflow-x-auto",
    );
    tabList.id = "settings-tabs";

    const createTab = (id, label, isActive = false, isDisabled = false) => {
        const li = document.createElement("li");

        const button = document.createElement("button");
        button.id = `${id}-tab`;
        addClass(button, "inline-block px-4 py-3 border-2 border-b-0 uppercase transition-all duration-150");
        setAttribute(button, { type: "button", "data-tab-button": "true" });
        setDataAttribute(button, "controls", id);
        setDataAttribute(button, "selected", isActive ? "true" : "false");

        if (isDisabled) {
            addClass(button, TAB_BUTTON_DISABLED_CLASSES);
            setAttribute(button, { disabled: "true" });
        } else {
            if (isActive) {
                addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
            } else {
                addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
            }
        }
        setText(button, label);

        button.addEventListener("click", () => switchSettingsTab(id));

        li.appendChild(button);
        return li;
    };

    tabList.appendChild(createTab("settings-general", "General", true));
    tabList.appendChild(createTab("settings-manga-details", "Details", false, true));
    tabList.appendChild(createTab("settings-navigation", "Navigation", false, true));
    tabList.appendChild(createTab("settings-display", "Display", false, true));

    // --- Tab Content Panes ---
    const tabContent = document.createElement("div");
    tabContent.id = "settings-tab-content";

    const createTabPane = (id, isActive = false) => {
        const pane = document.createElement("div");
        pane.id = id;
        addClass(pane, "pt-4 pb-8 px-2");
        if (!isActive) addClass(pane, "hidden");
        setAttribute(pane, { "data-tab-panel": "true" });
        return pane;
    };

    // General Pane
    const generalPane = createTabPane("settings-general", true);
    generalPane.innerHTML = `
        <div class="mb-10">
            <label class="${LABEL_CLASSES}">Theme</label>
            <div id="theme-buttons-placeholder" class="mt-2"></div>
        </div>
        
        <!-- Action Buttons section separated by whitespace, not boxes -->
        <div class="flex flex-wrap gap-4 mt-12">
            <button type="button" id="shortcuts-help-button" class="btn btn-secondary flex-1 sm:flex-none">View Shortcuts</button>
            <button type="button" id="reset-settings-button" class="btn btn-danger flex-1 sm:flex-none">Reset All Settings</button>
        </div>
    `;

    // Manga Details Pane
    const mangaDetailsPane = createTabPane("settings-manga-details");

    // Navigation Pane
    const navigationPane = createTabPane("settings-navigation");
    navigationPane.innerHTML = `
        <div class="mb-10">
            ${createBrutalistToggle("enable-nav-bar-checkbox", "navBarEnabled", "Enable Navigation Bar")}
            <p class="mt-2 text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-[#FF3366] pl-2">Top bar with chapter navigation buttons.</p>
        </div>

        <div class="mt-10 pt-8 border-t-4 border-black dark:border-white">
            <h4 class="text-xl font-syne font-bold uppercase tracking-tight text-black dark:text-white mb-6">Manual Scroll</h4>
            <div class="mb-6">
                <label for="scroll-amount-input" class="${LABEL_CLASSES}">Scroll Amount (px)</label>
                <input type="number" id="scroll-amount-input" name="scrollAmount" min="50" step="50" class="${NUMBER_INPUT_CLASSES}">
                <p class="mt-2 text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-[#FF3366] pl-2">Pixels to scroll when clicking top/bottom image halves.</p>
            </div>
        </div>
        
        <!-- Thick divider to separate distinct sections without enclosing them in boxes -->
        <div class="mt-10 pt-8 border-t-4 border-black dark:border-white">
            <h4 class="text-xl font-syne font-bold uppercase tracking-tight text-black dark:text-white mb-6">Auto Scroll</h4>
            <div class="space-y-6">
                ${createBrutalistToggle("enable-auto-scroll-checkbox", "autoScrollEnabled", "Enable Auto Scroll")}
                
                <div id="auto-scroll-options" class="pl-6 border-l-2 border-black/10 dark:border-white/10 ml-3">
                    <label for="auto-scroll-speed-input" class="${LABEL_CLASSES}">Scroll Speed (px/sec)</label>
                    <input type="number" id="auto-scroll-speed-input" name="autoScrollSpeed" min="10" step="10" class="${NUMBER_INPUT_CLASSES}">
                </div>
            </div>
        </div>

        <div class="mt-10 pt-8 border-t-4 border-black dark:border-white">
            <h4 class="text-xl font-syne font-bold uppercase tracking-tight text-black dark:text-white mb-6">Scrubber</h4>
            <div class="space-y-6">
                ${createBrutalistToggle("enable-scrubber-checkbox", "scrubberEnabled", "Enable Scrubber")}
                <p class="mt-2 text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-[#FF3366] pl-2">Side panel for quick chapter navigation.</p>
            </div>
        </div>
    `;

    // Display Pane
    const displayPane = createTabPane("settings-display");
    displayPane.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:space-x-12 space-y-8 sm:space-y-0 mb-10">
            <div class="flex-1">
                <label class="${LABEL_CLASSES}">Image Fit</label>
                <div id="image-fit-select-placeholder" class="mt-2 relative z-20"></div>
            </div>
            <div class="flex-1">
                <label for="spacing-amount-input" class="${LABEL_CLASSES}">Image Spacing (px)</label>
                <input type="number" id="spacing-amount-input" name="spacingAmount" min="0" step="1" class="${NUMBER_INPUT_CLASSES}">
            </div>
        </div>
        
        <div class="mb-10">
            ${createBrutalistToggle("collapse-spacing-checkbox", "collapseSpacing", "Collapse Spacing (Set to 0px)")}
        </div>

        <div class="mt-10 pt-8 border-t-4 border-black dark:border-white">
            <h4 class="text-xl font-syne font-bold uppercase tracking-tight text-black dark:text-white mb-6">Progress Bar</h4>
            <div class="space-y-8">
                ${createBrutalistToggle("enable-progress-bar-checkbox", "progressBarEnabled", "Enable Progress Bar")}
                
                <div class="flex flex-col sm:flex-row sm:space-x-8 space-y-6 sm:space-y-0 pl-6 border-l-2 border-black/10 dark:border-white/10 ml-3">
                    <div class="progress-bar-option flex-1">
                        <label class="${LABEL_CLASSES}">Position</label>
                        <div id="progress-bar-position-select-placeholder" class="mt-2 relative z-10"></div>
                    </div>
                    <div class="progress-bar-option flex-1">
                        <label class="${LABEL_CLASSES}">Style</label>
                        <div id="progress-bar-style-select-placeholder" class="mt-2 relative z-0"></div>
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
 */
export function switchSettingsTab(targetTabId) {
    const tabContainer = document.getElementById("settings-tabs");
    const contentContainer = document.getElementById("settings-tab-content");
    if (!tabContainer || !contentContainer) return;

    $$("button[data-tab-button]", tabContainer).forEach((button) => {
        const isTarget = getDataAttribute(button, "controls") === targetTabId;
        setDataAttribute(button, "selected", isTarget ? "true" : "false");

        button.className = "inline-block px-4 py-3 border-2 border-b-0 uppercase transition-all duration-150";

        if (button.disabled) {
            addClass(button, TAB_BUTTON_DISABLED_CLASSES);
        } else if (isTarget) {
            addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
        } else {
            addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
        }
    });

    $$("div[data-tab-panel]", contentContainer).forEach((pane) => {
        toggleClass(pane, "hidden", pane.id !== targetTabId);
    });
}

/**
 * Enables or disables settings tabs that require a manga to be loaded.
 */
export function toggleMangaSettingsTabs(enable) {
    const tabContainer = document.getElementById("settings-tabs");
    if (!tabContainer) return;

    const mangaTabIds = ["settings-manga-details-tab", "settings-navigation-tab", "settings-display-tab"];

    mangaTabIds.forEach((tabId) => {
        const button = document.getElementById(tabId);
        if (button) {
            button.disabled = !enable;

            button.className = "inline-block px-4 py-3 border-2 border-b-0 uppercase transition-all duration-150";

            if (!enable) {
                addClass(button, TAB_BUTTON_DISABLED_CLASSES);
            } else {
                const isSelected = getDataAttribute(button, "selected") === "true";
                if (isSelected) {
                    addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
                } else {
                    addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
                }
            }
        }
    });

    if (!enable) {
        const activeTab = $('button[data-selected="true"]', tabContainer);
        if (activeTab && mangaTabIds.includes(activeTab.id)) {
            switchSettingsTab("settings-general");
        }
    }
}
