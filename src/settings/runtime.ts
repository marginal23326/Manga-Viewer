import type { ConfiguredMangaSettings, ResolvedSettings, StoredMangaSettings } from "@/types";
import { PersistState, UIState } from "@/state";
import { applyCurrentZoom, applySpacing } from "@/viewer/zoom";
import { startAutoScroll, stopAutoScroll } from "@/viewer/auto-scroll";
import Config from "@/core/config";
import type { SelectItem } from "@/components/custom-select";
import { applyProgressBarSettings } from "@/viewer/progress-bar";
import { getCurrentManga } from "@/state/manga-library";
import { setNavBarEnabled } from "@/viewer/nav-bar";
import { setScrubberEnabled } from "@/viewer/scrubber";

export type SettingControlType = "checkbox" | "input" | "select";

export interface SettingDefinition<T> {
    readonly apply?: (value: T, settings: StoredMangaSettings) => void;
    readonly defaultValue: T;
    readonly dependents?: readonly string[];
    readonly invertDependents?: boolean;
    readonly items?: [T] extends [string] ? SelectItem<T>[] : never;
    readonly type: SettingControlType;
}

type MangaSettingConfig = { [K in keyof ConfiguredMangaSettings]: SettingDefinition<ConfiguredMangaSettings[K]> };

export const mangaSettingConfig: MangaSettingConfig = {
    autoScrollEnabled: {
        apply: (value) => (value ? startAutoScroll() : stopAutoScroll()),
        defaultValue: Config.DEFAULT_AUTO_SCROLL_ENABLED,
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
        defaultValue: Config.DEFAULT_AUTO_SCROLL_SPEED_PX_PER_SECOND,
        type: "input",
    },
    collapseSpacing: {
        apply: () => applySpacing(),
        defaultValue: Config.DEFAULT_COLLAPSE_SPACING,
        dependents: ["#spacingAmount"],
        invertDependents: true,
        type: "checkbox",
    },
    imageFit: {
        apply: applyCurrentZoom,
        defaultValue: Config.DEFAULT_IMAGE_FIT,
        items: [
            { text: "Original size", value: "original" },
            { text: "Fit width", value: "width" },
            { text: "Fit height", value: "height" },
        ],
        type: "select",
    },
    navBarEnabled: {
        apply: (value) => setNavBarEnabled(value),
        defaultValue: Config.DEFAULT_NAV_BAR_ENABLED,
        type: "checkbox",
    },
    progressBarEnabled: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarEnabled: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_ENABLED,
        dependents: [".progress-bar-option"],
        type: "checkbox",
    },
    progressBarPosition: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarPosition: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_POSITION,
        items: [
            { text: "Top", value: "top" },
            { text: "Bottom", value: "bottom" },
        ],
        type: "select",
    },
    progressBarStyle: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarStyle: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_STYLE,
        items: [
            { text: "Continuous", value: "continuous" },
            { text: "Discrete", value: "discrete" },
        ],
        type: "select",
    },
    scrollAmount: {
        defaultValue: Config.DEFAULT_SCROLL_AMOUNT,
        type: "input",
    },
    scrubberEnabled: {
        apply: (value) => setScrubberEnabled(value),
        defaultValue: Config.DEFAULT_SCRUBBER_ENABLED,
        type: "checkbox",
    },
    spacingAmount: {
        apply: () => applySpacing(),
        defaultValue: Config.DEFAULT_SPACING_AMOUNT_PX,
        type: "input",
    },
};

export function applySettings(settings: StoredMangaSettings): void {
    for (const key of Object.keys(settings) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key] as SettingDefinition<unknown> | undefined;
        const value = settings[key];
        if (config?.apply && value !== undefined) {
            config.apply(value, settings);
        }
    }
}

export function loadCurrentSettings(): ResolvedSettings {
    const generalSettings = {
        themePreference: PersistState.themePreference || "system",
    };

    const defaults = Object.fromEntries(
        (Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]).map((key) => [
            key,
            mangaSettingConfig[key].defaultValue,
        ]),
    ) as unknown as ConfiguredMangaSettings;

    const currentManga = getCurrentManga();
    const mangaSettings: StoredMangaSettings = currentManga ? (PersistState.mangaSettings[currentManga.id] ?? {}) : {};

    return { ...generalSettings, ...defaults, ...mangaSettings };
}

export function applyMangaSettings(): void {
    applySettings(loadCurrentSettings());
}
