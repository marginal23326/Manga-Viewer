import { type SegmentedItem, createSegmentedControl } from "@/components/segmented-control";
import type { SettingKey, ThemePreference } from "@/types";
import { type TabGroup, type TabItem, createTabGroup, createTabPane } from "@/components/tabs";
import { applyTheme, getAppliedTheme, onThemeApplied } from "@/app/theme";
import { createAbortScope, toInt } from "@/core/utils";
import { h, toggleClass } from "@/core/dom-utils";
import { CurrentSettings } from "@/state";

const createCard = (...rows: HTMLElement[]): HTMLDivElement => h("div", { className: "setting-card" }, ...rows);

const createRow = (title: string, control: HTMLElement, tag = "div"): HTMLElement =>
    h(
        tag,
        {
            className: `flex items-center justify-between py-2.5 px-4 gap-3 calm-transition hover:bg-ink/[0.015] dark:hover:bg-white/[0.02] ${tag === "label" ? "cursor-pointer" : ""}`,
        },
        h(
            "span",
            { className: "text-[13px] font-medium text-ink dark:text-paper select-none whitespace-nowrap" },
            title,
        ),
        control,
    );

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

function createStepper(value: number, onChange: (v: number) => void, { min = 0, step = 1, unit = "" } = {}) {
    const input = h("input", {
        className:
            "w-11 text-center font-mono text-xs font-semibold text-ink dark:text-paper bg-transparent outline-none input-no-spinner",
        min: String(min),
        onchange: () => apply(toInt(input.value)),
        required: true,
        type: "number",
        value: String(value),
    });

    const apply = (val: number) => {
        const next = Math.max(min, val);
        input.value = String(next);
        onChange(next);
    };

    const createBtn = (label: string, delta: number) =>
        h(
            "button",
            {
                className:
                    "w-7 h-7 flex items-center justify-center text-muted hover:text-ink dark:hover:text-paper active:scale-95 font-mono select-none cursor-pointer",
                onclick: () => apply(toInt(input.value) + delta),
                onmousedown: (e: MouseEvent) => e.preventDefault(),
                type: "button",
            },
            label,
        );

    return {
        element: h(
            "div",
            { className: "inline-flex items-center h-8 rounded-xl surface select-none overflow-hidden" },
            createBtn("−", -step),
            input,
            unit ? h("span", { className: "text-[11px] font-mono text-muted pr-1.5 select-none" }, unit) : null,
            createBtn("+", step),
        ),
        setValue: (v: number) => {
            input.value = String(v);
        },
    };
}

function createSettingBinders() {
    const scope = createAbortScope();
    const { signal } = scope;

    function theme(): HTMLElement {
        const ctrl = createSegmentedControl<ThemePreference>({
            items: [
                { icon: "Sun", text: "Light", value: "light" },
                { icon: "Moon", text: "Dark", value: "dark" },
                { icon: "Laptop", text: "System", value: "system" },
            ],
            onChange: applyTheme,
            value: getAppliedTheme(),
        });
        onThemeApplied((val) => ctrl.setValue(val), { signal });
        return createRow("Theme", ctrl.element);
    }

    function toggle(key: SettingKey, title: string, dependents: readonly HTMLElement[] = []): HTMLElement {
        const input = h("input", {
            className: "sr-only peer",
            onchange: () => CurrentSettings.hydrate({ [key]: input.checked }),
            type: "checkbox",
        });
        const track = h("div", {
            className:
                "w-11 h-6 bg-ink/15 dark:bg-white/15 peer-checked:bg-accent dark:peer-checked:bg-accent-light rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 calm-transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-xs peer-checked:after:translate-x-5",
        });
        const switchEl = h("div", { className: "relative inline-flex items-center shrink-0" }, input, track);

        CurrentSettings.onChange(
            key,
            (val) => {
                const checked = Boolean(val);
                input.checked = checked;
                for (const dep of dependents) setDisabled(dep, !checked);
            },
            { immediate: true, signal },
        );

        return createRow(title, switchEl, "label");
    }

    function segmented<T extends string>(key: SettingKey, title: string, items: SegmentedItem<T>[]): HTMLElement {
        const ctrl = createSegmentedControl<T>({
            items,
            onChange: (val) => CurrentSettings.hydrate({ [key]: val }),
            value: CurrentSettings[key] as T,
        });
        CurrentSettings.onChange(key, (val) => ctrl.setValue(val as T), { signal });
        return createRow(title, ctrl.element);
    }

    function stepper(
        key: SettingKey,
        title: string,
        options: { min?: number; step?: number; unit?: string } = {},
    ): HTMLElement {
        const ctrl = createStepper(
            CurrentSettings[key] as number,
            (val) => CurrentSettings.hydrate({ [key]: val }),
            options,
        );
        CurrentSettings.onChange(key, (val) => ctrl.setValue(val as number), { signal });
        return createRow(title, ctrl.element);
    }

    return {
        destroy: scope.abort,
        segmented,
        stepper,
        theme,
        toggle,
    };
}

function buildGeneralCard(
    binders: ReturnType<typeof createSettingBinders>,
    onShowShortcuts: () => void,
    onResetSettings: () => void,
): HTMLDivElement {
    const actions = splitRow(
        createRow("Keyboard shortcuts", createSmallButton("View", "secondary", onShowShortcuts)),
        createRow("Reading settings", createSmallButton("Reset", "danger", onResetSettings)),
    );

    return createCard(
        binders.theme(),
        binders.segmented("resumeMode", "Resume reading", [
            { text: "Ask", value: "ask" },
            { text: "Always continue", value: "always" },
            { text: "Restart", value: "never" },
        ]),
        actions,
    );
}

function buildNavigationCard(binders: ReturnType<typeof createSettingBinders>): HTMLDivElement {
    const chrome = splitRow(binders.toggle("navBarEnabled", "Nav bar"), binders.toggle("scrubberEnabled", "Scrubber"));
    const scrollAmount = binders.stepper("scrollAmount", "Click scroll distance", { min: 0, step: 50, unit: "px" });
    const autoScrollSpeed = binders.stepper("autoScrollSpeed", "Speed", { min: 10, step: 10, unit: "px/s" });
    const autoScroll = splitRow(binders.toggle("autoScrollEnabled", "Auto scroll", [autoScrollSpeed]), autoScrollSpeed);

    return createCard(chrome, scrollAmount, autoScroll);
}

function buildDisplayCard(binders: ReturnType<typeof createSettingBinders>): HTMLDivElement {
    const layout = splitRow(
        binders.segmented("imageFit", "Image fit", [
            { text: "Original", value: "original" },
            { text: "Width", value: "width" },
            { text: "Height", value: "height" },
        ]),
        binders.stepper("spacingAmount", "Page spacing", { min: 0, step: 5, unit: "px" }),
    );
    const positionAndStyle = splitRow(
        binders.segmented("progressBarPosition", "Position", [
            { text: "Bottom", value: "bottom" },
            { text: "Top", value: "top" },
        ]),
        binders.segmented("progressBarStyle", "Style", [
            { text: "Discrete", value: "discrete" },
            { text: "Continuous", value: "continuous" },
        ]),
    );
    const progressBar = binders.toggle("progressBarEnabled", "Progress bar", [positionAndStyle]);

    return createCard(layout, progressBar, positionAndStyle);
}

export interface SettingsFormOptions {
    mangaElement?: HTMLElement | null;
    onResetSettings: () => void;
    onShowShortcuts: () => void;
}

export interface SettingsForm {
    destroy: () => void;
    element: HTMLDivElement;
    tabs: TabGroup;
}

export function createSettingsFormElement(options: SettingsFormOptions): SettingsForm {
    const { mangaElement, onResetSettings, onShowShortcuts } = options;
    const binders = createSettingBinders();

    const tabItems: TabItem[] = [
        {
            isActive: true,
            label: "General",
            pane: createTabPane(buildGeneralCard(binders, onShowShortcuts, onResetSettings)),
        },
        { label: "Navigation", pane: createTabPane(buildNavigationCard(binders)) },
        { label: "Display", pane: createTabPane(buildDisplayCard(binders)) },
    ];

    if (mangaElement) {
        tabItems.push({ label: "Details", pane: createTabPane(mangaElement) });
    }

    const tabs = createTabGroup(tabItems);

    return {
        destroy: () => {
            binders.destroy();
            tabs.destroy();
        },
        element: tabs.element,
        tabs,
    };
}
