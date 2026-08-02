import { PersistState, UIState } from "../state/state";
import { applyCurrentZoom, applySpacing } from "./zoom-manager";
import { startAutoScroll, stopAutoScroll } from "./auto-scroll";
import Config from "../core/config";
import { applyProgressBarSettings } from "./progress-bar";
import { setNavBarEnabled } from "./navigation-manager";
import { setScrubberEnabled } from "./scrubber-manager";
import { withCurrentManga } from "../state/manga-library";

export const mangaSettingConfig = {
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
        type: "select",
    },
    progressBarStyle: {
        apply: (value, settings) => applyProgressBarSettings({ ...settings, progressBarStyle: value }),
        defaultValue: Config.DEFAULT_PROGRESS_BAR_STYLE,
        id: "progress-bar-style-select-placeholder",
        type: "select",
    },
    scrollAmount: {
        apply: () => {},
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

    const mangaSettings = withCurrentManga(
        (currentManga) => PersistState.mangaSettings[currentManga.id] || {},
        () => ({}),
    );

    return { ...generalSettings, ...defaults, ...mangaSettings };
}

export function applyMangaSettings() {
    applySettings(loadCurrentSettings());
}
