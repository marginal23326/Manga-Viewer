import {
    type BooleanSettingKey,
    type ConfiguredMangaSettings,
    type NumberSettingKey,
    PROGRESS_BAR_POSITION_OPTIONS,
    PROGRESS_BAR_STYLE_OPTIONS,
    RESUME_MODE_OPTIONS,
    type StringSettingKey,
} from "@/types";
import { type TabItem, createTabGroup, createTabPane } from "@/components/tabs";
import { createCard, createFormRow } from "@/components/form-row";
import { h, toggleClass } from "@/core/dom-utils";
import { CurrentSettings } from "@/state";
import type { Option } from "@/core/icons";
import { createAbortScope } from "@/core/utils";
import { createSegmentedControl } from "@/components/segmented-control";
import { createStepper } from "@/components/stepper";
import { createToggleSwitch } from "@/components/toggle-switch";

const splitRow = (left: HTMLElement, right: HTMLElement): HTMLDivElement =>
    h(
        "div",
        { className: "grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line/60" },
        left,
        right,
    );

const createSmallButton = (label: string, type: "danger" | "secondary", onclick: () => void): HTMLButtonElement =>
    h("button", { className: `btn-${type} btn-sm`, onclick, type: "button" }, label);

function setDisabled(container: HTMLElement, disabled: boolean): void {
    toggleClass(container, "opacity-40 pointer-events-none", disabled);
    for (const el of container.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")) {
        el.disabled = disabled;
    }
}

function createSettingBinders() {
    const scope = createAbortScope();
    const { signal } = scope;

    function toggle(key: BooleanSettingKey, title: string, dependents: readonly HTMLElement[] = []): HTMLElement {
        const ctrl = createToggleSwitch(CurrentSettings[key], (checked) => CurrentSettings.update(key, checked));
        CurrentSettings.onChange(
            key,
            (val) => {
                ctrl.setChecked(val);
                for (const dep of dependents) setDisabled(dep, !val);
            },
            { immediate: true, signal },
        );

        return createFormRow(title, ctrl.element, { tag: "label" });
    }

    function segmented<K extends StringSettingKey>(
        key: K,
        title: string,
        items: readonly Option<ConfiguredMangaSettings[K] & string>[],
    ): HTMLElement {
        type V = ConfiguredMangaSettings[K] & string;
        const ctrl = createSegmentedControl<V>({
            items,
            onChange: (val) => CurrentSettings.update(key, val),
            value: CurrentSettings[key] as V,
        });
        CurrentSettings.onChange(key, (val) => ctrl.setValue(val), { signal });
        return createFormRow(title, ctrl.element);
    }

    function stepper(
        key: NumberSettingKey,
        title: string,
        options: { min?: number; step?: number; unit?: string } = {},
    ): HTMLElement {
        const ctrl = createStepper(CurrentSettings[key], (val) => CurrentSettings.update(key, val), options);
        CurrentSettings.onChange(key, (val) => ctrl.setValue(val), { signal });
        return createFormRow(title, ctrl.element);
    }

    return {
        destroy: scope.abort,
        segmented,
        stepper,
        toggle,
    };
}

function buildGeneralCard(
    binders: ReturnType<typeof createSettingBinders>,
    onShowShortcuts: () => void,
    onResetSettings: () => void,
    isMangaScope: boolean,
): HTMLDivElement {
    const actions = splitRow(
        createFormRow("Keyboard shortcuts", createSmallButton("View", "secondary", onShowShortcuts)),
        createFormRow(
            isMangaScope ? "Manga overrides" : "Reading settings",
            createSmallButton(
                isMangaScope ? "Use global" : "Reset to defaults",
                isMangaScope ? "secondary" : "danger",
                onResetSettings,
            ),
        ),
    );

    return createCard(binders.segmented("resumeMode", "Resume reading", RESUME_MODE_OPTIONS), actions);
}

function buildNavigationCard(binders: ReturnType<typeof createSettingBinders>): HTMLDivElement {
    const chrome = splitRow(binders.toggle("navBarEnabled", "Nav bar"), binders.toggle("scrubberEnabled", "Scrubber"));
    const scrollAmount = binders.stepper("scrollAmount", "Click scroll distance", { min: 0, step: 50, unit: "px" });

    return createCard(chrome, scrollAmount);
}

function buildDisplayCard(binders: ReturnType<typeof createSettingBinders>): HTMLDivElement {
    const spacingAmount = binders.stepper("spacingAmount", "Page spacing", { min: 0, step: 5, unit: "px" });
    const positionAndStyle = splitRow(
        binders.segmented("progressBarPosition", "Position", PROGRESS_BAR_POSITION_OPTIONS),
        binders.segmented("progressBarStyle", "Style", PROGRESS_BAR_STYLE_OPTIONS),
    );
    const progressBar = binders.toggle("progressBarEnabled", "Progress bar", [positionAndStyle]);

    return createCard(spacingAmount, progressBar, positionAndStyle);
}

export interface SettingsFormOptions {
    isMangaScope: boolean;
    onResetSettings: () => void;
    onShowShortcuts: () => void;
}

export interface SettingsForm {
    destroy: () => void;
    element: HTMLDivElement;
}

export function createSettingsFormElement(options: SettingsFormOptions): SettingsForm {
    const { isMangaScope, onResetSettings, onShowShortcuts } = options;
    const binders = createSettingBinders();

    const tabItems: TabItem[] = [
        {
            isActive: true,
            label: "General",
            pane: createTabPane(buildGeneralCard(binders, onShowShortcuts, onResetSettings, isMangaScope)),
        },
        { label: "Navigation", pane: createTabPane(buildNavigationCard(binders)) },
        { label: "Display", pane: createTabPane(buildDisplayCard(binders)) },
    ];

    const tabs = createTabGroup(tabItems);

    return {
        destroy: () => {
            binders.destroy();
            tabs.destroy();
        },
        element: tabs.element,
    };
}
