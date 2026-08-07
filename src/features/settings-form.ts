import { type TabGroup, createTabGroup, createTabPane } from "@/components/tabs";
import { h } from "@/core/dom-utils";
import { mangaSettingConfig } from "./viewer-settings-runtime";

// Label, Input and Hint Classes
const LABEL_CLASSES = "block text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white mb-2";
const NUMBER_INPUT_CLASSES =
    "block w-32 px-4 py-2 brutal-input brutal-input-focus brutal-shadow-sm transition-all duration-150 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed";
const HINT_CLASSES =
    "mt-2 text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-accent pl-2";

const createHint = (text: string): HTMLParagraphElement => h("p", { className: HINT_CLASSES }, text);

const createFieldLabel = (text: string, forId?: string): HTMLLabelElement =>
    h("label", { className: LABEL_CLASSES, ...(forId ? { htmlFor: forId } : {}) }, text);

const createPlaceholder = (id: string, className = "mt-2"): HTMLDivElement => h("div", { className, id });

interface NumberFieldOptions {
    min?: number;
    step?: number;
}

const createNumberField = (id: string, name: string, { min, step }: NumberFieldOptions = {}): HTMLInputElement =>
    h("input", { className: NUMBER_INPUT_CLASSES, id, min, name, step, type: "number" });

const createSection = (title: string, ...content: HTMLElement[]): HTMLDivElement => {
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
const createBrutalistToggle = (id: string, name: string, labelText: string): HTMLLabelElement => {
    const input = h("input", { className: "sr-only peer", id, name, type: "checkbox" });
    const track = h("div", {
        className:
            "w-12 h-6 bg-paper dark:bg-ink border-2 border-black dark:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent peer-focus:ring-offset-2 dark:peer-focus:ring-offset-ink peer-checked:bg-accent peer-checked:border-accent transition-colors relative after:content-[''] after:absolute after:-top-[2px] after:-left-[2px] after:bg-black dark:after:bg-white after:border-2 after:border-black dark:after:border-white after:w-6 after:h-6 after:transition-transform peer-checked:after:translate-x-6 peer-checked:after:bg-white peer-checked:after:border-black",
    });
    const label = h(
        "span",
        {
            className:
                "ml-4 text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white group-hover:text-accent transition-colors",
        },
        labelText,
    );

    const toggle = h("label", { className: "relative inline-flex items-center cursor-pointer group", htmlFor: id });
    toggle.append(input, track, label);
    return toggle;
};

function buildGeneralPane(): HTMLDivElement {
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

function buildNavigationPane(): HTMLDivElement {
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

function buildDisplayPane(): HTMLDivElement {
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

let settingsTabs: TabGroup | null = null;

export function createSettingsFormElement(): HTMLDivElement {
    const settingsContainer = h("div");

    const tabList = h("ul", {
        className:
            "flex flex-nowrap text-sm font-space font-bold tracking-widest border-b-4 border-black dark:border-white mb-6 gap-2 overflow-x-auto",
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
