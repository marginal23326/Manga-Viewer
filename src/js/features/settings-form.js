import { $, $$, addClass, getDataAttribute, h, setDataAttribute, toggleClass } from "../core/dom-utils";
import { mangaSettingConfig } from "./viewer-settings-runtime";

const TAB_BUTTON_ACTIVE_CLASSES =
    "bg-black text-white dark:bg-white dark:text-black brutal-border brutal-shadow-accent translate-y-[-2px] translate-x-[-2px]";
const TAB_BUTTON_INACTIVE_HOVER_CLASSES =
    "hover:bg-[#FF3366] hover:text-white hover:border-[#FF3366] text-black dark:text-white border-transparent";
const TAB_BUTTON_DISABLED_CLASSES = "cursor-not-allowed opacity-30 text-gray-400 dark:text-gray-500 border-transparent";
const TAB_BUTTON_BASE_CLASSES = "inline-block px-4 py-3 border-2 border-b-0 uppercase transition-all duration-150";

function applyTabButtonState(button, { active = false, disabled = false } = {}) {
    button.className = TAB_BUTTON_BASE_CLASSES;

    if (disabled) {
        addClass(button, TAB_BUTTON_DISABLED_CLASSES);
    } else if (active) {
        addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
    } else {
        addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
    }
}

// Label, Input and Hint Classes
const LABEL_CLASSES = "block text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white mb-2";
const NUMBER_INPUT_CLASSES =
    "block w-32 px-4 py-2 brutal-input brutal-input-focus brutal-shadow-sm transition-all duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed";
const HINT_CLASSES =
    "mt-2 text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-[#FF3366] pl-2";

const createTab = (id, label, isActive = false, isDisabled = false) => {
    const button = h(
        "button",
        {
            className: TAB_BUTTON_BASE_CLASSES,
            "data-tab-button": "true",
            dataset: { controls: id, selected: isActive ? "true" : "false" },
            id: `${id}-tab`,
            type: "button",
        },
        label,
    );

    button.disabled = isDisabled;
    applyTabButtonState(button, { active: isActive, disabled: isDisabled });
    button.addEventListener("click", () => switchSettingsTab(id));

    return h("li", {}, button);
};

const createTabPane = (id, isActive = false) => {
    const pane = h("div", {
        className: "pt-4 pb-8 px-2",
        "data-tab-panel": "true",
        id,
    });
    if (!isActive) addClass(pane, "hidden");
    return pane;
};

const createHint = (text) => h("p", { className: HINT_CLASSES }, text);

const createFieldLabel = (text, forId) =>
    h("label", { className: LABEL_CLASSES, ...(forId ? { htmlFor: forId } : {}) }, text);

const createPlaceholder = (id, className = "mt-2") => h("div", { className, id });

const createNumberField = (id, name, { min, step } = {}) =>
    h("input", { className: NUMBER_INPUT_CLASSES, id, min, name, step, type: "number" });

const createSection = (title, ...content) => {
    const section = h("div", { className: "mt-10 pt-8 border-t-4 border-black dark:border-white" });
    const heading = h(
        "h4",
        { className: "text-xl font-syne font-bold uppercase tracking-tight text-black dark:text-white mb-6" },
        title,
    );
    section.append(heading, ...content);
    return section;
};

// Brutalist Toggle Switch structure
const createBrutalistToggle = (id, name, labelText) => {
    const input = h("input", { className: "sr-only peer", id, name, type: "checkbox" });
    const track = h("div", {
        className:
            "w-12 h-6 bg-[#f4f4f0] dark:bg-[#0a0a0a] border-2 border-black dark:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#FF3366] peer-focus:ring-offset-2 dark:peer-focus:ring-offset-[#0a0a0a] peer-checked:bg-[#FF3366] peer-checked:border-[#FF3366] transition-colors relative after:content-[''] after:absolute after:-top-[2px] after:-left-[2px] after:bg-black dark:after:bg-white after:border-2 after:border-black dark:after:border-white after:w-6 after:h-6 after:transition-transform peer-checked:after:translate-x-6 peer-checked:after:bg-white peer-checked:after:border-black",
    });
    const label = h(
        "span",
        {
            className:
                "ml-4 text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white group-hover:text-[#FF3366] transition-colors",
        },
        labelText,
    );

    const toggle = h("label", { className: "relative inline-flex items-center cursor-pointer group", htmlFor: id });
    toggle.append(input, track, label);
    return toggle;
};

function buildGeneralPane() {
    const pane = createTabPane("settings-general", true);

    const themeSection = h("div", { className: "mb-10" });
    themeSection.append(createFieldLabel("Theme"), createPlaceholder("theme-buttons-placeholder"));

    // Action Buttons section separated by whitespace, not boxes
    const actionButtons = h("div", { className: "flex flex-wrap gap-4 mt-12" });
    actionButtons.append(
        h(
            "button",
            { className: "btn btn-secondary flex-1 sm:flex-none", id: "shortcuts-help-button", type: "button" },
            "View Shortcuts",
        ),
        h(
            "button",
            { className: "btn btn-danger flex-1 sm:flex-none", id: "reset-settings-button", type: "button" },
            "Reset All Settings",
        ),
    );

    pane.append(themeSection, actionButtons);
    return pane;
}

function buildNavigationPane() {
    const pane = createTabPane("settings-navigation");

    const navBarSection = h("div", { className: "mb-10" });
    navBarSection.append(
        createBrutalistToggle(mangaSettingConfig.navBarEnabled.id, "navBarEnabled", "Enable Navigation Bar"),
        createHint("Top bar with chapter navigation buttons."),
    );

    const scrollAmountField = h("div", { className: "mb-6" });
    scrollAmountField.append(
        createFieldLabel("Scroll Amount (px)", mangaSettingConfig.scrollAmount.id),
        createNumberField(mangaSettingConfig.scrollAmount.id, "scrollAmount", { min: 50, step: 50 }),
        createHint("Pixels to scroll when clicking top/bottom image halves."),
    );
    const manualScrollSection = createSection("Manual Scroll", scrollAmountField);

    const autoScrollOptions = h("div", {
        className: "pl-6 border-l-2 border-black/10 dark:border-white/10 ml-3",
        id: "auto-scroll-options",
    });
    autoScrollOptions.append(
        createFieldLabel("Scroll Speed (px/sec)", mangaSettingConfig.autoScrollSpeed.id),
        createNumberField(mangaSettingConfig.autoScrollSpeed.id, "autoScrollSpeed", { min: 10, step: 10 }),
    );
    const autoScrollBody = h("div", { className: "space-y-6" });
    autoScrollBody.append(
        createBrutalistToggle(mangaSettingConfig.autoScrollEnabled.id, "autoScrollEnabled", "Enable Auto Scroll"),
        autoScrollOptions,
    );
    const autoScrollSection = createSection("Auto Scroll", autoScrollBody);

    const scrubberBody = h("div", { className: "space-y-6" });
    scrubberBody.append(
        createBrutalistToggle(mangaSettingConfig.scrubberEnabled.id, "scrubberEnabled", "Enable Scrubber"),
        createHint("Side panel for quick chapter navigation."),
    );
    const scrubberSection = createSection("Scrubber", scrubberBody);

    pane.append(navBarSection, manualScrollSection, autoScrollSection, scrubberSection);
    return pane;
}

function buildDisplayPane() {
    const pane = createTabPane("settings-display");

    const imageFitField = h("div", { className: "flex-1" });
    imageFitField.append(
        createFieldLabel("Image Fit"),
        createPlaceholder(mangaSettingConfig.imageFit.id, "mt-2 relative z-20"),
    );

    const spacingField = h("div", { className: "flex-1" });
    spacingField.append(
        createFieldLabel("Image Spacing (px)", mangaSettingConfig.spacingAmount.id),
        createNumberField(mangaSettingConfig.spacingAmount.id, "spacingAmount", { min: 0, step: 1 }),
    );

    const topRow = h("div", { className: "flex flex-col sm:flex-row sm:space-x-12 space-y-8 sm:space-y-0 mb-10" });
    topRow.append(imageFitField, spacingField);

    const collapseSpacingSection = h("div", { className: "mb-10" });
    collapseSpacingSection.append(
        createBrutalistToggle(
            mangaSettingConfig.collapseSpacing.id,
            "collapseSpacing",
            "Collapse Spacing (Set to 0px)",
        ),
    );

    const positionField = h("div", { className: "progress-bar-option flex-1" });
    positionField.append(
        createFieldLabel("Position"),
        createPlaceholder(mangaSettingConfig.progressBarPosition.id, "mt-2 relative z-10"),
    );

    const styleField = h("div", { className: "progress-bar-option flex-1" });
    styleField.append(
        createFieldLabel("Style"),
        createPlaceholder(mangaSettingConfig.progressBarStyle.id, "mt-2 relative z-0"),
    );

    const progressBarOptions = h("div", {
        className:
            "flex flex-col sm:flex-row sm:space-x-8 space-y-6 sm:space-y-0 pl-6 border-l-2 border-black/10 dark:border-white/10 ml-3",
    });
    progressBarOptions.append(positionField, styleField);

    const progressBarBody = h("div", { className: "space-y-8" });
    progressBarBody.append(
        createBrutalistToggle(mangaSettingConfig.progressBarEnabled.id, "progressBarEnabled", "Enable Progress Bar"),
        progressBarOptions,
    );
    const progressBarSection = createSection("Progress Bar", progressBarBody);

    pane.append(topRow, collapseSpacingSection, progressBarSection);
    return pane;
}

/**
 * Creates the HTML structure for the settings form tabs and content panes.
 */
export function createSettingsFormElement() {
    const settingsContainer = h("div");

    // --- Tabs ---
    const tabList = h("ul", {
        className:
            "flex flex-nowrap text-sm font-space font-bold tracking-widest border-b-4 border-black dark:border-white mb-6 gap-2 overflow-x-auto",
        id: "settings-tabs",
    });

    tabList.append(
        createTab("settings-general", "General", true),
        createTab("settings-manga-details", "Details", false, true),
        createTab("settings-navigation", "Navigation", false, true),
        createTab("settings-display", "Display", false, true),
    );

    // --- Tab Content Panes ---
    const tabContent = h("div", { id: "settings-tab-content" });
    tabContent.append(
        buildGeneralPane(),
        createTabPane("settings-manga-details"),
        buildNavigationPane(),
        buildDisplayPane(),
    );

    // --- Assemble ---
    settingsContainer.append(tabList, tabContent);

    return settingsContainer;
}

/**
 * Handles switching between settings tabs.
 */
export function switchSettingsTab(targetTabId) {
    const tabContainer = $("#settings-tabs");
    const contentContainer = $("#settings-tab-content");
    if (!tabContainer || !contentContainer) return;

    $$("button[data-tab-button]", tabContainer).forEach((button) => {
        const isTarget = getDataAttribute(button, "controls") === targetTabId;
        setDataAttribute(button, "selected", isTarget ? "true" : "false");

        applyTabButtonState(button, { active: isTarget, disabled: button.disabled });
    });

    $$("div[data-tab-panel]", contentContainer).forEach((pane) => {
        toggleClass(pane, "hidden", pane.id !== targetTabId);
    });
}

/**
 * Enables or disables settings tabs that require a manga to be loaded.
 */
export function toggleMangaSettingsTabs(enable) {
    const tabContainer = $("#settings-tabs");
    if (!tabContainer) return;

    const mangaTabIds = ["settings-manga-details-tab", "settings-navigation-tab", "settings-display-tab"];

    mangaTabIds.forEach((tabId) => {
        const button = $(`#${tabId}`);
        if (button) {
            button.disabled = !enable;

            const isSelected = getDataAttribute(button, "selected") === "true";
            applyTabButtonState(button, { active: enable && isSelected, disabled: !enable });
        }
    });

    if (!enable) {
        const activeTab = $('button[data-selected="true"]', tabContainer);
        if (activeTab && mangaTabIds.includes(activeTab.id)) {
            switchSettingsTab("settings-general");
        }
    }
}
