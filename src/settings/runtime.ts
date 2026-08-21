import type { ConfiguredMangaSettings, ResolvedSettings } from "@/types";
import { DEFAULT_MANGA_SETTINGS, PersistState, UIState, getCurrentSettings } from "@/state";
import { applyCurrentZoom, applySpacing } from "@/viewer/zoom";
import { startAutoScroll, stopAutoScroll } from "@/viewer/auto-scroll";
import type { SelectItem } from "@/components/custom-select";
import { applyProgressBarSettings } from "@/viewer/progress-bar";
import { setNavBarEnabled } from "@/viewer/nav-bar";
import { setScrubberEnabled } from "@/viewer/scrubber";

export type SettingControlType = "checkbox" | "input" | "select";

export interface SettingDefinition<T> {
    readonly apply?: (value: T, settings: ConfiguredMangaSettings) => void;
    readonly defaultValue: T;
    readonly dependents?: readonly string[];
    readonly invertDependents?: boolean;
    readonly items?: [T] extends [string] ? SelectItem<T>[] : never;
    readonly selectWidth?: string;
    readonly type: SettingControlType;
}

type MangaSettingConfig = { [K in keyof ConfiguredMangaSettings]: SettingDefinition<ConfiguredMangaSettings[K]> };

export const mangaSettingConfig: MangaSettingConfig = {
    autoScrollEnabled: {
        apply: (value) => (value ? startAutoScroll() : stopAutoScroll()),
        defaultValue: DEFAULT_MANGA_SETTINGS.autoScrollEnabled,
        dependents: ["#auto-scroll-options"],
        type: "checkbox",
    },
    autoScrollSpeed: {
        apply: () => {
            if (UIState.isAutoScrolling) {
                stopAutoScroll();
                startAutoScroll();
            }
        },
        defaultValue: DEFAULT_MANGA_SETTINGS.autoScrollSpeed,
        type: "input",
    },
    collapseSpacing: {
        apply: () => applySpacing(),
        defaultValue: DEFAULT_MANGA_SETTINGS.collapseSpacing,
        dependents: ["#spacingAmount"],
        invertDependents: true,
        type: "checkbox",
    },
    imageFit: {
        apply: applyCurrentZoom,
        defaultValue: DEFAULT_MANGA_SETTINGS.imageFit,
        items: [
            { text: "Original size", value: "original" },
            { text: "Fit width", value: "width" },
            { text: "Fit height", value: "height" },
        ],
        type: "select",
    },
    navBarEnabled: {
        apply: (value) => setNavBarEnabled(value),
        defaultValue: DEFAULT_MANGA_SETTINGS.navBarEnabled,
        type: "checkbox",
    },
    progressBarEnabled: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarEnabled: value }),
        defaultValue: DEFAULT_MANGA_SETTINGS.progressBarEnabled,
        dependents: [".progress-bar-option"],
        type: "checkbox",
    },
    progressBarPosition: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarPosition: value }),
        defaultValue: DEFAULT_MANGA_SETTINGS.progressBarPosition,
        items: [
            { text: "Top", value: "top" },
            { text: "Bottom", value: "bottom" },
        ],
        type: "select",
    },
    progressBarStyle: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarStyle: value }),
        defaultValue: DEFAULT_MANGA_SETTINGS.progressBarStyle,
        items: [
            { text: "Continuous", value: "continuous" },
            { text: "Discrete", value: "discrete" },
        ],
        type: "select",
    },
    resumeMode: {
        defaultValue: DEFAULT_MANGA_SETTINGS.resumeMode,
        items: [
            { text: "Ask every time", value: "ask" },
            { text: "Always continue", value: "always" },
            { text: "Always start over", value: "never" },
        ],
        selectWidth: "w-48",
        type: "select",
    },
    scrollAmount: {
        defaultValue: DEFAULT_MANGA_SETTINGS.scrollAmount,
        type: "input",
    },
    scrubberEnabled: {
        apply: (value) => setScrubberEnabled(value),
        defaultValue: DEFAULT_MANGA_SETTINGS.scrubberEnabled,
        type: "checkbox",
    },
    spacingAmount: {
        apply: () => applySpacing(),
        defaultValue: DEFAULT_MANGA_SETTINGS.spacingAmount,
        type: "input",
    },
};

export function applySettings(settings: ConfiguredMangaSettings): void {
    for (const key of Object.keys(settings) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key] as SettingDefinition<unknown> | undefined;
        const value = settings[key];
        if (config?.apply && value !== undefined) {
            config.apply(value, settings);
        }
    }
}

export function loadCurrentSettings(): ResolvedSettings {
    return {
        ...getCurrentSettings(),
        themePreference: PersistState.themePreference,
    };
}

export function applyMangaSettings(): void {
    applySettings(loadCurrentSettings());
}
