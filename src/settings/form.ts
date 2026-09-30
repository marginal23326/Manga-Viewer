import {
    type BooleanSettingKey,
    type ConfiguredMangaSettings,
    type NumberSettingKey,
    PROGRESS_BAR_POSITION_OPTIONS,
    PROGRESS_BAR_STYLE_OPTIONS,
    RESUME_MODE_OPTIONS,
    type StringSettingKey,
} from "@/types";
import { type Option, createSegmentedControl } from "@/components/segmented-control";
import { type StepperOptions, createStepper } from "@/components/stepper";
import { createCard, createFormRow } from "@/components/form-row";
import { createTabGroup, createTabPane } from "@/components/tabs";
import { CurrentSettings } from "@/state";
import { bind } from "@/core/binding";
import { createAbortScope } from "@/core/utils";
import { createToggleSwitch } from "@/components/toggle-switch";
import { h } from "@/core/dom-utils";

const splitRow = (left: HTMLElement, right: HTMLElement): HTMLFieldSetElement =>
    h(
        "fieldset",
        {
            className:
                "grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-line/60 min-w-0 disabled:opacity-40 disabled:pointer-events-none",
        },
        left,
        right,
    );

const createSmallButton = (label: string, type: "danger" | "secondary", onclick: () => void): HTMLButtonElement =>
    h("button", { className: `btn-${type} btn-sm`, onclick, type: "button" }, label);

function createSettingRows(signal: AbortSignal) {
    return {
        segmented<K extends StringSettingKey>(
            key: K,
            title: string,
            items: readonly Option<ConfiguredMangaSettings[K]>[],
        ): HTMLElement {
            return createFormRow(title, createSegmentedControl({ binding: bind(CurrentSettings, key), items, signal }));
        },
        stepper(key: NumberSettingKey, title: string, options: Omit<StepperOptions, "signal"> = {}): HTMLElement {
            return createFormRow(title, createStepper(bind(CurrentSettings, key), { ...options, signal }));
        },
        toggle(key: BooleanSettingKey, title: string): HTMLElement {
            return createFormRow(title, createToggleSwitch(bind(CurrentSettings, key), { signal }), { tag: "label" });
        },
    };
}

type SettingRows = ReturnType<typeof createSettingRows>;

function buildGeneralCard(
    rows: SettingRows,
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

    return createCard(rows.segmented("resumeMode", "Resume reading", RESUME_MODE_OPTIONS), actions);
}

function buildNavigationCard(rows: SettingRows): HTMLDivElement {
    const chrome = splitRow(rows.toggle("navBarEnabled", "Nav bar"), rows.toggle("scrubberEnabled", "Scrubber"));
    const scrollAmount = rows.stepper("scrollAmount", "Click scroll distance", { min: 0, step: 50, unit: "px" });

    return createCard(chrome, scrollAmount);
}

function buildDisplayCard(rows: SettingRows, signal: AbortSignal): HTMLDivElement {
    const spacingAmount = rows.stepper("spacingAmount", "Page spacing", { min: 0, step: 5, unit: "px" });
    const positionAndStyle = splitRow(
        rows.segmented("progressBarPosition", "Position", PROGRESS_BAR_POSITION_OPTIONS),
        rows.segmented("progressBarStyle", "Style", PROGRESS_BAR_STYLE_OPTIONS),
    );
    const progressBar = rows.toggle("progressBarEnabled", "Progress bar");
    CurrentSettings.onChange(
        "progressBarEnabled",
        (enabled) => {
            positionAndStyle.disabled = !enabled;
        },
        { immediate: true, signal },
    );

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
    const scope = createAbortScope();
    const rows = createSettingRows(scope.signal);

    return {
        destroy: scope.abort,
        element: createTabGroup([
            {
                label: "General",
                pane: createTabPane(buildGeneralCard(rows, onShowShortcuts, onResetSettings, isMangaScope)),
            },
            { label: "Navigation", pane: createTabPane(buildNavigationCard(rows)) },
            { label: "Display", pane: createTabPane(buildDisplayCard(rows, scope.signal)) },
        ]),
    };
}
