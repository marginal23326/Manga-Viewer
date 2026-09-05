import { $, $$, h, toggleClass } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, SettingKey } from "@/types";
import { type TabGroup, createTabGroup, createTabPane } from "@/components/tabs";
import { createFieldLabel, createFormGroup, createHint, createNumberField } from "@/components/form-field";
import { type SelectItem } from "@/components/custom-select";

const C = { autoScroll: "auto-scroll", progressBar: "progress-bar" } as const;

type SettingControlType = "checkbox" | "input" | "select";

interface SettingDefinition<T> {
    readonly dependents?: readonly string[];
    readonly items?: [T] extends [string] ? SelectItem<T>[] : never;
    readonly selectWidth?: string;
    readonly type: SettingControlType;
}

type MangaSettingConfig = { [K in keyof ConfiguredMangaSettings]: SettingDefinition<ConfiguredMangaSettings[K]> };

export const mangaSettingConfig: MangaSettingConfig = {
    autoScrollEnabled: {
        dependents: [`.${C.autoScroll}`],
        type: "checkbox",
    },
    autoScrollSpeed: {
        type: "input",
    },
    collapseSpacing: {
        type: "checkbox",
    },
    imageFit: {
        items: [
            { text: "Original size", value: "original" },
            { text: "Fit width", value: "width" },
            { text: "Fit height", value: "height" },
        ],
        type: "select",
    },
    navBarEnabled: {
        type: "checkbox",
    },
    progressBarEnabled: {
        dependents: [`.${C.progressBar}`],
        type: "checkbox",
    },
    progressBarPosition: {
        items: [
            { text: "Top", value: "top" },
            { text: "Bottom", value: "bottom" },
        ],
        type: "select",
    },
    progressBarStyle: {
        items: [
            { text: "Continuous", value: "continuous" },
            { text: "Discrete", value: "discrete" },
        ],
        type: "select",
    },
    resumeMode: {
        items: [
            { text: "Ask every time", value: "ask" },
            { text: "Always continue", value: "always" },
            { text: "Always restart", value: "never" },
        ],
        selectWidth: "w-48",
        type: "select",
    },
    scrollAmount: {
        type: "input",
    },
    scrubberEnabled: {
        type: "checkbox",
    },
    spacingAmount: {
        type: "input",
    },
};

const createSettingPlaceholder = (key: SettingKey, className = "mt-2"): HTMLDivElement =>
    h("div", { className, id: key });

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

function buildGeneralPane(
    themePlaceholder: HTMLDivElement,
    onShowShortcuts: () => void,
    onResetSettings: () => void,
): HTMLDivElement {
    const pane = createTabPane(true);

    const themeSection = h("div", { className: "mb-10" });
    themeSection.append(createFieldLabel("Theme"), themePlaceholder);

    const shortcutsButton = h(
        "button",
        { className: "btn-secondary flex-1 sm:flex-none", type: "button" },
        "View shortcuts",
    );
    shortcutsButton.addEventListener("click", onShowShortcuts);

    const resetButton = h(
        "button",
        { className: "btn-danger flex-1 sm:flex-none", type: "button" },
        "Reset all settings",
    );
    resetButton.addEventListener("click", onResetSettings);

    const actionButtons = h("div", { className: "flex flex-wrap gap-3 mt-10" });
    actionButtons.append(shortcutsButton, resetButton);

    pane.append(themeSection, actionButtons);
    return pane;
}

function buildNavigationPane(): HTMLDivElement {
    const pane = createTabPane();

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
        { className: `pl-6 border-l-2 divider-line ml-2.5 ${C.autoScroll}` },
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

    const resumeField = h("div");
    resumeField.append(createFieldLabel("When reopening a manga"), createSettingPlaceholder("resumeMode"));
    const resumeSection = createSection("Resume progress", resumeField);

    pane.append(navBarSection, manualScrollSection, autoScrollSection, scrubberSection, resumeSection);
    return pane;
}

function buildDisplayPane(): HTMLDivElement {
    const pane = createTabPane();

    const imageFitField = h("div", { className: "flex-1" });
    imageFitField.append(createFieldLabel("Image fit"), createSettingPlaceholder("imageFit"));

    const spacingField = createFormGroup(
        "Image spacing (px)",
        createNumberField("spacingAmount", { min: 0, step: 1 }),
        { className: "flex-1" },
    );

    const topRow = h("div", { className: "flex flex-col sm:flex-row sm:space-x-12 space-y-8 sm:space-y-0 mb-10" });
    topRow.append(imageFitField, spacingField);

    const collapseSpacingSection = h("div", { className: "mb-10" });
    collapseSpacingSection.append(createToggle("collapseSpacing", "Collapse spacing (set to 0px)"));

    const positionField = h("div", { className: `${C.progressBar} flex-1` });
    positionField.append(createFieldLabel("Position"), createSettingPlaceholder("progressBarPosition"));

    const styleField = h("div", { className: `${C.progressBar} flex-1` });
    styleField.append(createFieldLabel("Style"), createSettingPlaceholder("progressBarStyle"));

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
let generalPane: HTMLDivElement | null = null;
let detailsPane: HTMLDivElement | null = null;
let navigationPane: HTMLDivElement | null = null;
let displayPane: HTMLDivElement | null = null;

export interface SettingsForm {
    detailsPane: HTMLDivElement;
    element: HTMLDivElement;
    themePlaceholder: HTMLDivElement;
}

export function createSettingsFormElement(onShowShortcuts: () => void, onResetSettings: () => void): SettingsForm {
    const settingsContainer = h("div");

    const tabList = h("ul", {
        className: "flex flex-nowrap text-sm border-b divider-line mb-6 gap-1 overflow-x-auto",
        id: "settings-tabs",
    });

    const tabContent = h("div", { id: "settings-tab-content" });

    settingsTabs = createTabGroup(tabList, tabContent);

    const themePlaceholder = h("div", { className: "mt-2" });

    generalPane = buildGeneralPane(themePlaceholder, onShowShortcuts, onResetSettings);
    detailsPane = createTabPane();
    navigationPane = buildNavigationPane();
    displayPane = buildDisplayPane();

    settingsTabs.addTab("General", generalPane, { isActive: true });
    settingsTabs.addTab("Details", detailsPane, { isDisabled: true });
    settingsTabs.addTab("Navigation", navigationPane, { isDisabled: true });
    settingsTabs.addTab("Display", displayPane, { isDisabled: true });

    settingsContainer.append(tabList, tabContent);

    return { detailsPane, element: settingsContainer, themePlaceholder };
}

export const settingSelector = (key: SettingKey): string => `#${key}`;

export function syncDependentUI(container: HTMLElement, key: SettingKey): void {
    const config = mangaSettingConfig[key];
    if (!config.dependents) return;

    const checkboxEl = $<HTMLInputElement>(settingSelector(key), container);
    if (!checkboxEl) return;
    const isEnabled = checkboxEl.checked;

    for (const selector of config.dependents) {
        for (const el of $$(selector, container)) {
            const input = (el.matches("input, button") ? el : $("input, button", el)) as
                | HTMLButtonElement
                | HTMLInputElement
                | null;

            toggleClass(el, "opacity-50 cursor-not-allowed", !isEnabled);
            if (input) input.disabled = !isEnabled;
        }
    }
}

export function updateDependentUI(container: HTMLElement): void {
    for (const key of Object.keys(mangaSettingConfig) as SettingKey[]) syncDependentUI(container, key);
}

export function switchSettingsTab(targetPane: HTMLElement): void {
    settingsTabs?.switchTo(targetPane);
}

export function toggleMangaSettingsTabs(enable: boolean): void {
    if (!settingsTabs || !generalPane || !detailsPane || !navigationPane || !displayPane) return;

    const mangaPanes: HTMLElement[] = [detailsPane, navigationPane, displayPane];
    const activePane = settingsTabs.getActivePane();

    for (const pane of mangaPanes) settingsTabs.setEnabled(pane, enable);

    if (!enable && activePane && mangaPanes.includes(activePane)) {
        switchSettingsTab(generalPane);
    }
}
