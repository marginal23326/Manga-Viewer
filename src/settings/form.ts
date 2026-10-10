import { CurrentSettings, type MangaSettings, PersistState } from "@/state";
import { type Option, createSegmentedControl } from "@/components/segmented-control";
import {
    PROGRESS_BAR_POSITION_OPTIONS,
    PROGRESS_BAR_STYLE_OPTIONS,
    RESUME_MODE_OPTIONS,
    THEME_PREFERENCE_OPTIONS,
} from "@/types";
import { type StepperOptions, createStepper } from "@/components/stepper";
import { createCard, createFormRow } from "@/components/form-row";
import { bind } from "@/core/binding";
import { createTabGroup } from "@/components/tabs";
import { createToggleSwitch } from "@/components/toggle-switch";
import { h } from "@/core/dom-utils";

type SettingKey<V> = { [K in keyof MangaSettings]: MangaSettings[K] extends V ? K : never }[keyof MangaSettings];

const createSmallButton = (label: string, type: "danger" | "secondary", onclick: () => void): HTMLButtonElement =>
    h("button", { className: `btn-${type} btn-sm`, onclick, type: "button" }, label);

function createSettingRows(signal: AbortSignal) {
    return {
        segmented<K extends SettingKey<string>>(
            key: K,
            title: string,
            items: readonly Option<MangaSettings[K]>[],
        ): HTMLElement {
            return createFormRow(title, createSegmentedControl({ binding: bind(CurrentSettings, key), items, signal }));
        },
        stepper(key: SettingKey<number>, title: string, options: Omit<StepperOptions, "signal"> = {}): HTMLElement {
            return createFormRow(title, createStepper(bind(CurrentSettings, key), { ...options, signal }));
        },
        toggle(key: SettingKey<boolean>, title: string): HTMLElement {
            return createFormRow(title, createToggleSwitch(bind(CurrentSettings, key), { signal }), { tag: "label" });
        },
    };
}

type SettingRows = ReturnType<typeof createSettingRows>;

function buildGeneralCard(
    rows: SettingRows,
    signal: AbortSignal,
    { isMangaScope, onResetSettings, onShowShortcuts }: SettingsFormOptions,
): HTMLDivElement {
    const theme = createSegmentedControl({
        binding: bind(PersistState, "themePreference"),
        items: THEME_PREFERENCE_OPTIONS,
        signal,
    });

    return createCard(
        createFormRow("Theme", theme),
        rows.segmented("resumeMode", "Resume reading", RESUME_MODE_OPTIONS),
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
}

function buildNavigationCard(rows: SettingRows): HTMLDivElement {
    return createCard(
        rows.toggle("toolbarEnabled", "Toolbar"),
        rows.toggle("scrubberEnabled", "Scrubber"),
        rows.stepper("scrollAmount", "Click scroll distance", { min: 0, step: 50, unit: "px" }),
    );
}

function buildDisplayCard(rows: SettingRows, signal: AbortSignal): HTMLDivElement {
    const spacingAmount = rows.stepper("spacingAmount", "Page spacing", { min: 0, step: 5, unit: "px" });
    const progressBar = rows.toggle("progressBarEnabled", "Progress bar");
    const progressBarOptions = h(
        "fieldset",
        { className: "divide-y divide-line min-w-0 disabled:opacity-40 disabled:pointer-events-none" },
        rows.segmented("progressBarPosition", "Position", PROGRESS_BAR_POSITION_OPTIONS),
        rows.segmented("progressBarStyle", "Style", PROGRESS_BAR_STYLE_OPTIONS),
    );
    CurrentSettings.onChange(
        "progressBarEnabled",
        (enabled) => {
            progressBarOptions.disabled = !enabled;
        },
        { immediate: true, signal },
    );

    return createCard(spacingAmount, progressBar, progressBarOptions);
}

interface SettingsFormOptions {
    isMangaScope: boolean;
    onResetSettings: () => void;
    onShowShortcuts: () => void;
}

interface SettingsForm {
    destroy: () => void;
    element: HTMLDivElement;
}

export function createSettingsFormElement(options: SettingsFormOptions): SettingsForm {
    const controller = new AbortController();
    const rows = createSettingRows(controller.signal);

    return {
        destroy: () => controller.abort(),
        element: createTabGroup([
            { label: "General", pane: buildGeneralCard(rows, controller.signal, options) },
            { label: "Navigation", pane: buildNavigationCard(rows) },
            { label: "Display", pane: buildDisplayCard(rows, controller.signal) },
        ]),
    };
}
