import { type TabGroup, createTabGroup, createTabPane } from "@/components/tabs";
import { createFieldLabel, createFormGroup, createHint, createNumberField } from "@/components/form-field";
import type { ConfiguredMangaSettings } from "@/types";
import { h } from "@/core/dom-utils";

type SettingKey = keyof ConfiguredMangaSettings;

const createPlaceholder = (id: string, className = "mt-2"): HTMLDivElement => h("div", { className, id });

const createSettingPlaceholder = (key: SettingKey, className = "mt-2"): HTMLDivElement =>
    createPlaceholder(key, className);

const createSection = (title: string, ...content: HTMLElement[]): HTMLDivElement => {
    const section = h("div", { className: "mt-8 pt-8 border-t divider-line" });
    const heading = h("h4", { className: "font-serif text-lg font-medium text-ink dark:text-paper mb-5" }, title);
    section.append(heading, ...content);
    return section;
};

// Toggle switch
const createToggle = (key: SettingKey, labelText: string): HTMLLabelElement => {
    const input = h("input", { className: "sr-only peer", id: key, name: key, type: "checkbox" });
    const track = h("div", {
        className:
            "w-10 h-6 rounded-full bg-ink/15 dark:bg-white/15 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-ink peer-checked:bg-accent dark:peer-checked:bg-accent-light transition-colors duration-200 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:w-5 after:h-5 after:shadow-soft after:transition-transform after:duration-200 peer-checked:after:translate-x-4",
    });
    const label = h(
        "span",
        { className: "ml-3.5 text-sm font-medium text-ink/80 dark:text-paper/75 transition-colors" },
        labelText,
    );

    const toggle = h("label", { className: "relative inline-flex items-center cursor-pointer group", htmlFor: key });
    toggle.append(input, track, label);
    return toggle;
};

function buildGeneralPane(): HTMLDivElement {
    const pane = createTabPane("settings-general", true);

    const themeSection = h("div", { className: "mb-10" });
    themeSection.append(createFieldLabel("Theme"), createPlaceholder("theme-buttons-placeholder"));

    const actionButtons = h("div", { className: "flex flex-wrap gap-3 mt-10" });
    actionButtons.append(
        h(
            "button",
            { className: "btn-secondary flex-1 sm:flex-none", id: "shortcuts-help-button", type: "button" },
            "View shortcuts",
        ),
        h(
            "button",
            { className: "btn-danger flex-1 sm:flex-none", id: "reset-settings-button", type: "button" },
            "Reset all settings",
        ),
    );

    pane.append(themeSection, actionButtons);
    return pane;
}

function buildNavigationPane(): HTMLDivElement {
    const pane = createTabPane("settings-navigation");

    const navBarSection = h("div", { className: "mb-10" });
    navBarSection.append(
        createToggle("navBarEnabled", "Enable navigation bar"),
        createHint("Top bar with chapter navigation buttons."),
    );

    const manualScrollSection = createSection(
        "Manual scroll",
        createFormGroup("Scroll amount (px)", createNumberField("scrollAmount", { min: 50, step: 50 }), {
            className: "mb-6",
            hint: "Pixels to scroll when clicking top/bottom image halves.",
        }),
    );

    const autoScrollOptions = createFormGroup(
        "Scroll speed (px/sec)",
        createNumberField("autoScrollSpeed", { min: 10, step: 10 }),
        { className: "pl-6 border-l-2 divider-line ml-2.5", id: "auto-scroll-options" },
    );
    const autoScrollBody = h("div", { className: "space-y-6" });
    autoScrollBody.append(createToggle("autoScrollEnabled", "Enable auto scroll"), autoScrollOptions);
    const autoScrollSection = createSection("Auto scroll", autoScrollBody);

    const scrubberBody = h("div", { className: "space-y-6" });
    scrubberBody.append(
        createToggle("scrubberEnabled", "Enable scrubber"),
        createHint("Side panel for quick chapter navigation."),
    );
    const scrubberSection = createSection("Scrubber", scrubberBody);

    pane.append(navBarSection, manualScrollSection, autoScrollSection, scrubberSection);
    return pane;
}

function buildDisplayPane(): HTMLDivElement {
    const pane = createTabPane("settings-display");

    const imageFitField = h("div", { className: "flex-1" });
    imageFitField.append(createFieldLabel("Image fit"), createSettingPlaceholder("imageFit", "mt-2 relative z-20"));

    const spacingField = createFormGroup(
        "Image spacing (px)",
        createNumberField("spacingAmount", { min: 0, step: 1 }),
        { className: "flex-1" },
    );

    const topRow = h("div", { className: "flex flex-col sm:flex-row sm:space-x-12 space-y-8 sm:space-y-0 mb-10" });
    topRow.append(imageFitField, spacingField);

    const collapseSpacingSection = h("div", { className: "mb-10" });
    collapseSpacingSection.append(createToggle("collapseSpacing", "Collapse spacing (set to 0px)"));

    const positionField = h("div", { className: "progress-bar-option flex-1" });
    positionField.append(
        createFieldLabel("Position"),
        createSettingPlaceholder("progressBarPosition", "mt-2 relative z-10"),
    );

    const styleField = h("div", { className: "progress-bar-option flex-1" });
    styleField.append(createFieldLabel("Style"), createSettingPlaceholder("progressBarStyle", "mt-2 relative z-0"));

    const progressBarOptions = h("div", {
        className: "flex flex-col sm:flex-row sm:space-x-8 space-y-6 sm:space-y-0 pl-6 border-l-2 divider-line ml-2.5",
    });
    progressBarOptions.append(positionField, styleField);

    const progressBarBody = h("div", { className: "space-y-8" });
    progressBarBody.append(createToggle("progressBarEnabled", "Enable progress bar"), progressBarOptions);
    const progressBarSection = createSection("Progress bar", progressBarBody);

    pane.append(topRow, collapseSpacingSection, progressBarSection);
    return pane;
}

let settingsTabs: TabGroup | null = null;

export function createSettingsFormElement(): HTMLDivElement {
    const settingsContainer = h("div");

    const tabList = h("ul", {
        className: "flex flex-nowrap text-sm border-b divider-line mb-6 gap-1 overflow-x-auto",
        id: "settings-tabs",
    });

    const tabContent = h("div", { id: "settings-tab-content" });

    settingsTabs = createTabGroup(tabList, tabContent);

    tabList.append(
        settingsTabs.createTab("settings-general", "General", { isActive: true }),
        settingsTabs.createTab("settings-manga-details", "Details", { isDisabled: true }),
        settingsTabs.createTab("settings-navigation", "Navigation", { isDisabled: true }),
        settingsTabs.createTab("settings-display", "Display", { isDisabled: true }),
    );

    tabContent.append(
        buildGeneralPane(),
        createTabPane("settings-manga-details"),
        buildNavigationPane(),
        buildDisplayPane(),
    );

    settingsContainer.append(tabList, tabContent);

    return settingsContainer;
}

export function switchSettingsTab(targetTabId: string): void {
    settingsTabs?.switchTo(targetTabId);
}

export function toggleMangaSettingsTabs(enable: boolean): void {
    if (!settingsTabs) return;

    const mangaTabIds = ["settings-manga-details-tab", "settings-navigation-tab", "settings-display-tab"];
    const activeTabId = settingsTabs.getActiveId();

    mangaTabIds.forEach((tabId) => settingsTabs?.setEnabled(tabId, enable));

    if (!enable && activeTabId && mangaTabIds.includes(activeTabId)) {
        switchSettingsTab("settings-general");
    }
}
