import Config from "../core/Config";
import { getCurrentManga } from "../core/MangaLibrary";
import { PersistState } from "../core/State";

import { startAutoScroll, stopAutoScroll } from "./AutoScroll";
import { applyProgressBarSettings } from "./ProgressBar";
import { setScrubberEnabled } from "./ScrubberManager";
import { applyCurrentZoom, applySpacing } from "./ZoomManager";
import { setNavBarEnabled } from "./NavigationManager";

export const mangaSettingConfig = {
    scrollAmount: {
        id: "scroll-amount-input",
        type: "input",
        defaultValue: Config.DEFAULT_SCROLL_AMOUNT,
        apply: () => {},
    },
    imageFit: {
        id: "image-fit-select-placeholder",
        type: "select",
        defaultValue: Config.DEFAULT_IMAGE_FIT,
        apply: applyCurrentZoom,
    },
    spacingAmount: {
        id: "spacing-amount-input",
        type: "input",
        defaultValue: Config.DEFAULT_SPACING_AMOUNT,
        apply: (value, settings) => applySpacing(value, settings.collapseSpacing),
    },
    collapseSpacing: {
        id: "collapse-spacing-checkbox",
        type: "checkbox",
        defaultValue: Config.DEFAULT_COLLAPSE_SPACING,
        apply: (value, settings) => applySpacing(settings.spacingAmount, value),
    },
    progressBarEnabled: {
        id: "enable-progress-bar-checkbox",
        type: "checkbox",
        defaultValue: Config.DEFAULT_PROGRESS_BAR_ENABLED,
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarEnabled: value }),
    },
    progressBarPosition: {
        id: "progress-bar-position-select-placeholder",
        type: "select",
        defaultValue: Config.DEFAULT_PROGRESS_BAR_POSITION,
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarPosition: value }),
    },
    progressBarStyle: {
        id: "progress-bar-style-select-placeholder",
        type: "select",
        defaultValue: Config.DEFAULT_PROGRESS_BAR_STYLE,
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarStyle: value }),
    },
    autoScrollEnabled: {
        id: "enable-auto-scroll-checkbox",
        type: "checkbox",
        defaultValue: Config.DEFAULT_AUTO_SCROLL_ENABLED,
        apply: (value) => (value ? startAutoScroll() : stopAutoScroll()),
    },
    autoScrollSpeed: {
        id: "auto-scroll-speed-input",
        type: "input",
        defaultValue: Config.DEFAULT_AUTO_SCROLL_SPEED,
        apply: () => {
            if (PersistState.isAutoScrolling) {
                stopAutoScroll();
                startAutoScroll();
            }
        },
    },
    scrubberEnabled: {
        id: "enable-scrubber-checkbox",
        type: "checkbox",
        defaultValue: Config.DEFAULT_SCRUBBER_ENABLED,
        apply: (value) => setScrubberEnabled(value),
    },
    navBarEnabled: {
        id: "enable-nav-bar-checkbox",
        type: "checkbox",
        defaultValue: Config.DEFAULT_NAV_BAR_ENABLED,
        apply: (value) => setNavBarEnabled(value),
    },
};

export function applySettings(settings) {
    for (const key in settings) {
        if (mangaSettingConfig[key]?.apply) {
            mangaSettingConfig[key].apply(settings[key], settings);
        }
    }
}

export function loadCurrentSettings() {
    const generalSettings = {
        themePreference: PersistState.themePreference || "system",
    };
    const defaults = Object.keys(mangaSettingConfig).reduce((acc, key) => {
        acc[key] = mangaSettingConfig[key].defaultValue;
        return acc;
    }, {});

    let mangaSettings = {};
    const currentManga = getCurrentManga();
    if (currentManga) {
        mangaSettings = PersistState.mangaSettings[currentManga.id] || {};
    }

    return { ...generalSettings, ...defaults, ...mangaSettings };
}

export function applyMangaSettings() {
    applySettings(loadCurrentSettings());
}
