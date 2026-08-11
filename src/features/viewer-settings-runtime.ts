import type { ConfiguredMangaSettings, ResolvedSettings, StoredMangaSettings } from "@/types";
import { PersistState, UIState } from "@/state/state";
import { applyCurrentZoom, applySpacing } from "./zoom-manager";
import { startAutoScroll, stopAutoScroll } from "./auto-scroll";
import Config from "@/core/config";
import type { SelectItem } from "@/components/custom-select";
import { applyProgressBarSettings } from "./progress-bar";
import { setNavBarEnabled } from "./navigation-manager";
import { setScrubberEnabled } from "./scrubber-manager";
import { withCurrentManga } from "@/state/manga-library";

export type SettingControlType = "checkbox" | "input" | "select";

export interface SettingDefinition<T> {
    readonly apply?: (value: T, settings: StoredMangaSettings) => void;
    readonly defaultValue: T;
    readonly id: string;
    readonly items?: [T] extends [string] ? SelectItem<T>[] : never;
    readonly type: SettingControlType;
}

type MangaSettingConfig = { [K in keyof ConfiguredMangaSettings]: SettingDefinition<ConfiguredMangaSettings[K]> };

export const mangaSettingConfig: MangaSettingConfig = {
    autoScrollEnabled: {
        apply: (value) => (value ? startAutoScroll() : stopAutoScroll()),
        defaultValue: Config.DEFAULT_AUTO_SCROLL_ENABLED,
        id: "enable-auto-scroll-checkbox",
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
        id: "auto-scroll-speed-input",
        type: "input",
    },
    collapseSpacing: {
        apply: () => applySpacing(),
        defaultValue: Config.DEFAULT_COLLAPSE_SPACING,
        id: "collapse-spacing-checkbox",
        type: "checkbox",
    },
    imageFit: {
        apply: applyCurrentZoom,
        defaultValue: Config.DEFAULT_IMAGE_FIT,
        id: "image-fit-select-placeholder",
        items: [
            { text: "Original Size", value: "original" },
            { text: "Fit Width", value: "width" },
            { text: "Fit Height", value: "height" },
        ],
        type: "select",
    },
    navBarEnabled: {
        apply: (value) => setNavBarEnabled(value),
        defaultValue: Config.DEFAULT_NAV_BAR_ENABLED,
        id: "enable-nav-bar-checkbox",
        type: "checkbox",
    },
    progressBarEnabled: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarEnabled: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_ENABLED,
        id: "enable-progress-bar-checkbox",
        type: "checkbox",
    },
    progressBarPosition: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarPosition: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_POSITION,
        id: "progress-bar-position-select-placeholder",
        items: [
            { text: "Top", value: "top" },
            { text: "Bottom", value: "bottom" },
        ],
        type: "select",
    },
    progressBarStyle: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarStyle: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_STYLE,
        id: "progress-bar-style-select-placeholder",
        items: [
            { text: "Continuous", value: "continuous" },
            { text: "Discrete", value: "discrete" },
        ],
        type: "select",
    },
    scrollAmount: {
        defaultValue: Config.DEFAULT_SCROLL_AMOUNT,
        id: "scroll-amount-input",
        type: "input",
    },
    scrubberEnabled: {
        apply: (value) => setScrubberEnabled(value),
        defaultValue: Config.DEFAULT_SCRUBBER_ENABLED,
        id: "enable-scrubber-checkbox",
        type: "checkbox",
    },
    spacingAmount: {
        apply: () => applySpacing(),
        defaultValue: Config.DEFAULT_SPACING_AMOUNT_PX,
        id: "spacing-amount-input",
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

    const mangaSettings = withCurrentManga(
        (currentManga) => PersistState.mangaSettings[currentManga.id] ?? {},
        (): StoredMangaSettings => ({}),
    );

    return { ...generalSettings, ...defaults, ...mangaSettings };
}

export function applyMangaSettings(): void {
    applySettings(loadCurrentSettings());
}
