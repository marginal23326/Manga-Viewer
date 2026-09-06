import { $, addClass, h, toggleClass } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, SettingKey } from "@/types";
import {
    type NumberFieldOptions,
    createFieldLabel,
    createFormGroup,
    createHint,
    createNumberField,
} from "@/components/form-field";
import { type SelectInstance, type SelectItem, createSelect } from "@/components/custom-select";
import { type TabGroup, createTabGroup, createTabPane } from "@/components/tabs";
import { createAbortScope, toInt } from "@/core/utils";
import { CurrentSettings } from "@/state";

function setDependentEnabled(container: HTMLElement, enabled: boolean): void {
    toggleClass(container, "opacity-50 cursor-not-allowed", !enabled);
    const control = $<HTMLButtonElement | HTMLInputElement>("input, button", container);
    if (control) control.disabled = !enabled;
}

const createSection = (title: string, ...content: HTMLElement[]): HTMLDivElement => {
    const section = h("div", { className: "mt-8 pt-8 border-t divider-line" });
    const heading = h("h4", { className: "font-serif text-lg font-medium text-ink dark:text-paper mb-5" }, title);
    section.append(heading, ...content);
    return section;
};

interface ToggleElements {
    element: HTMLLabelElement;
    input: HTMLInputElement;
}

function createToggleElement(key: SettingKey, labelText: string): ToggleElements {
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

    const element = h("label", { className: "relative inline-flex items-center cursor-pointer group", htmlFor: key });
    element.append(input, track, label);
    return { element, input };
}

interface SettingBinders {
    numberField: (key: SettingKey, options?: NumberFieldOptions) => HTMLInputElement;
    select: (key: SettingKey, items: SelectItem[], width?: string) => HTMLDivElement;
    toggle: (key: SettingKey, labelText: string, dependents?: readonly HTMLElement[]) => HTMLLabelElement;
}

interface SettingBindersHandle extends SettingBinders {
    destroy: () => void;
    numberInputs: readonly HTMLInputElement[];
}

function createSettingBinders(): SettingBindersHandle {
    const scope = createAbortScope();
    const { signal } = scope;
    const numberInputs: HTMLInputElement[] = [];
    const selects: SelectInstance[] = [];

    function toggle(key: SettingKey, labelText: string, dependents: readonly HTMLElement[] = []): HTMLLabelElement {
        const { element, input } = createToggleElement(key, labelText);

        input.addEventListener("change", () => CurrentSettings.hydrate({ [key]: input.checked }));
        CurrentSettings.onChange(
            key,
            (value) => {
                input.checked = value as boolean;
                for (const dependent of dependents) setDependentEnabled(dependent, value as boolean);
            },
            { immediate: true, signal },
        );

        return element;
    }

    function numberField(key: SettingKey, options: NumberFieldOptions = {}): HTMLInputElement {
        const input = createNumberField(key, options);
        numberInputs.push(input);

        input.addEventListener("input", () => CurrentSettings.hydrate({ [key]: toInt(input.value) }));
        CurrentSettings.onChange(
            key,
            (value) => {
                if (document.activeElement !== input) input.value = String(value);
            },
            { immediate: true, signal },
        );

        return input;
    }

    function select(key: SettingKey, items: SelectItem[], width?: string): HTMLDivElement {
        const instance = createSelect({
            items,
            onChange: (value) => CurrentSettings.hydrate({ [key]: value as ConfiguredMangaSettings[SettingKey] }),
            value: String(CurrentSettings[key]),
            width,
        });
        selects.push(instance);
        addClass(instance.element, "mt-2");

        CurrentSettings.onChange(
            key,
            (value) => {
                instance.setValue(String(value));
            },
            { signal },
        );

        return instance.element;
    }

    return {
        destroy: (): void => {
            scope.abort();
            for (const instance of selects) instance.destroy();
        },
        numberField,
        numberInputs,
        select,
        toggle,
    };
}

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

function buildNavigationPane(binders: SettingBinders): HTMLDivElement {
    const pane = createTabPane();

    const navBarSection = h("div", { className: "mb-10" });
    navBarSection.append(
        binders.toggle("navBarEnabled", "Enable navigation bar"),
        createHint("Top bar with chapter navigation buttons."),
    );

    const manualScrollSection = createSection(
        "Manual scroll",
        createFormGroup("Scroll amount (px)", binders.numberField("scrollAmount", { min: 50, step: 50 }), {
            className: "mb-6",
            hint: "Pixels to scroll when clicking top/bottom image halves.",
        }),
    );

    const autoScrollOptions = createFormGroup(
        "Scroll speed (px/sec)",
        binders.numberField("autoScrollSpeed", { min: 10, step: 10 }),
        { className: "pl-6 border-l-2 divider-line ml-2.5" },
    );
    const autoScrollBody = h("div", { className: "space-y-6" });
    autoScrollBody.append(
        binders.toggle("autoScrollEnabled", "Enable auto scroll", [autoScrollOptions]),
        autoScrollOptions,
    );
    const autoScrollSection = createSection("Auto scroll", autoScrollBody);

    const scrubberBody = h("div", { className: "space-y-6" });
    scrubberBody.append(
        binders.toggle("scrubberEnabled", "Enable scrubber"),
        createHint("Side panel for quick chapter navigation."),
    );
    const scrubberSection = createSection("Scrubber", scrubberBody);

    const resumeField = h("div");
    resumeField.append(
        createFieldLabel("When reopening a manga"),
        binders.select(
            "resumeMode",
            [
                { text: "Ask every time", value: "ask" },
                { text: "Always continue", value: "always" },
                { text: "Always restart", value: "never" },
            ],
            "w-48",
        ),
    );
    const resumeSection = createSection("Resume progress", resumeField);

    pane.append(navBarSection, manualScrollSection, autoScrollSection, scrubberSection, resumeSection);
    return pane;
}

function buildDisplayPane(binders: SettingBinders): HTMLDivElement {
    const pane = createTabPane();

    const imageFitField = h("div", { className: "flex-1" });
    imageFitField.append(
        createFieldLabel("Image fit"),
        binders.select("imageFit", [
            { text: "Original size", value: "original" },
            { text: "Fit width", value: "width" },
            { text: "Fit height", value: "height" },
        ]),
    );

    const spacingField = createFormGroup(
        "Image spacing (px)",
        binders.numberField("spacingAmount", { min: 0, step: 1 }),
        { className: "flex-1" },
    );

    const topRow = h("div", { className: "flex flex-col sm:flex-row sm:space-x-12 space-y-8 sm:space-y-0 mb-10" });
    topRow.append(imageFitField, spacingField);

    const collapseSpacingSection = h("div", { className: "mb-10" });
    collapseSpacingSection.append(binders.toggle("collapseSpacing", "Collapse spacing (set to 0px)"));

    const positionField = h("div", { className: "flex-1" });
    positionField.append(
        createFieldLabel("Position"),
        binders.select("progressBarPosition", [
            { text: "Top", value: "top" },
            { text: "Bottom", value: "bottom" },
        ]),
    );

    const styleField = h("div", { className: "flex-1" });
    styleField.append(
        createFieldLabel("Style"),
        binders.select("progressBarStyle", [
            { text: "Continuous", value: "continuous" },
            { text: "Discrete", value: "discrete" },
        ]),
    );

    const progressBarOptions = h("div", {
        className: "flex flex-col sm:flex-row sm:space-x-8 space-y-6 sm:space-y-0 pl-6 border-l-2 divider-line ml-2.5",
    });
    progressBarOptions.append(positionField, styleField);

    const progressBarBody = h("div", { className: "space-y-8" });
    progressBarBody.append(
        binders.toggle("progressBarEnabled", "Enable progress bar", [positionField, styleField]),
        progressBarOptions,
    );
    const progressBarSection = createSection("Progress bar", progressBarBody);

    pane.append(topRow, collapseSpacingSection, progressBarSection);
    return pane;
}

export interface SettingsForm {
    destroy: () => void;
    detailsPane: HTMLDivElement;
    element: HTMLDivElement;
    numberInputs: readonly HTMLInputElement[];
    setMangaTabsEnabled: (enabled: boolean) => void;
    tabs: TabGroup;
    themePlaceholder: HTMLDivElement;
}

export function createSettingsFormElement(onShowShortcuts: () => void, onResetSettings: () => void): SettingsForm {
    const settingsContainer = h("div");

    const tabList = h("ul", {
        className: "flex flex-nowrap text-sm border-b divider-line mb-6 gap-1 overflow-x-auto",
        id: "settings-tabs",
    });
    const tabContent = h("div", { id: "settings-tab-content" });
    const tabs = createTabGroup(tabList, tabContent);

    const themePlaceholder = h("div", { className: "mt-2" });
    const binders = createSettingBinders();

    const generalPane = buildGeneralPane(themePlaceholder, onShowShortcuts, onResetSettings);
    const detailsPane = createTabPane();
    const navigationPane = buildNavigationPane(binders);
    const displayPane = buildDisplayPane(binders);

    tabs.addTab("General", generalPane, { isActive: true });
    tabs.addTab("Details", detailsPane, { isDisabled: true });
    tabs.addTab("Navigation", navigationPane, { isDisabled: true });
    tabs.addTab("Display", displayPane, { isDisabled: true });

    settingsContainer.append(tabList, tabContent);

    const mangaPanes: HTMLElement[] = [detailsPane, navigationPane, displayPane];

    return {
        destroy: binders.destroy,
        detailsPane,
        element: settingsContainer,
        numberInputs: binders.numberInputs,
        setMangaTabsEnabled: (enabled): void => {
            const activePane = tabs.getActivePane();
            for (const pane of mangaPanes) tabs.setEnabled(pane, enabled);
            if (!enabled && activePane && mangaPanes.includes(activePane)) tabs.switchTo(generalPane);
        },
        tabs,
        themePlaceholder,
    };
}
