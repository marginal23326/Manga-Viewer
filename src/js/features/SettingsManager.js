import { createSelect } from "../components/CustomSelect";
import { showModal, hideModal } from "../components/Modal";
import { createThemeButtons } from "../components/ThemeButtons";
import Config from "../core/Config";
import { $, $$, setValue, getValue, setChecked, isChecked, toggleClass } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { State } from "../core/State";
import { showShortcutsHelp } from "../ui/Shortcuts";
import { applyTheme } from "../ui/ThemeManager";

import { startAutoScroll, stopAutoScroll } from "./AutoScroll";
import { createMangaFormElement, getMangaFormData, validateMangaForm, focusAndScrollToInvalidInput } from "./MangaForm";
import { editManga } from "./MangaManager";
import { applyProgressBarSettings } from "./ProgressBar";
import { createSettingsFormElement, toggleMangaSettingsTabs, switchSettingsTab } from "./SettingsForm";
import { applyCurrentZoom, applySpacing } from "./ZoomManager";

const SETTINGS_MODAL_ID = "settings-modal";
let settingsFormContainer = null;
let initialSettingsOnOpen = {};
let settingsSaved = false;

// --- Settings Configuration ---
const mangaSettingConfig = {
    scrollAmount: {
        id: "scroll-amount-input",
        type: "input",
        defaultValue: Config.DEFAULT_SCROLL_AMOUNT,
        apply: () => {}, // Applied via keybindings, no direct apply needed here
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
            if (State.isAutoScrolling) {
                stopAutoScroll();
                startAutoScroll();
            }
        },
    },
};

// --- Generic Setting Helpers ---

function getSettingsFromDOM(container) {
    const settings = {};
    for (const key in mangaSettingConfig) {
        const config = mangaSettingConfig[key];

        if (config.type === "select") {
            settings[key] = container[`_${key}Select`]?.getValue() ?? config.defaultValue;
        } else {
            const element = $(`#${config.id}`, container);
            if (element) {
                switch (config.type) {
                    case "input":
                        settings[key] = parseInt(getValue(element), 10) || config.defaultValue;
                        break;
                    case "checkbox":
                        settings[key] = isChecked(element);
                        break;
                }
            }
        }
    }
    return settings;
}

function setSettingsToDOM(settings, container) {
    for (const key in mangaSettingConfig) {
        const config = mangaSettingConfig[key];

        if (config.type === "select") {
            container[`_${key}Select`]?.setValue(settings[key]);
        } else {
            const element = $(`#${config.id}`, container);
            if (element) {
                switch (config.type) {
                    case "input":
                        setValue(element, settings[key]);
                        break;
                    case "checkbox":
                        setChecked(element, settings[key]);
                        break;
                }
            }
        }
    }
}

function applySettings(settings) {
    for (const key in settings) {
        if (mangaSettingConfig[key] && mangaSettingConfig[key].apply) {
            mangaSettingConfig[key].apply(settings[key], settings);
        }
    }
}

// --- Loading Settings ---
export function loadCurrentSettings() {
    const generalSettings = {
        themePreference: State.themePreference || "system",
    };
    const defaults = Object.keys(mangaSettingConfig).reduce((acc, key) => {
        acc[key] = mangaSettingConfig[key].defaultValue;
        return acc;
    }, {});

    let mangaSettings = {};
    if (State.currentManga) {
        mangaSettings = State.mangaSettings[State.currentManga.id] || {};
    }

    return { ...generalSettings, ...defaults, ...mangaSettings };
}

// --- UI Interaction ---

export function openSettings() {
    settingsSaved = false;
    initialSettingsOnOpen = loadCurrentSettings();
    settingsFormContainer = createSettingsFormElement();

    // Create Theme Buttons
    settingsFormContainer._themeButtons = createThemeButtons({
        container: $("#theme-buttons-placeholder", settingsFormContainer),
        items: [
            { value: "light", text: "Light", icon: "Sun" },
            { value: "dark", text: "Dark", icon: "Moon" },
            { value: "system", text: "System", icon: "Laptop" },
        ],
        value: initialSettingsOnOpen.themePreference,
        onChange: applyTheme,
    });

    // Create Manga-Specific Selects (if manga loaded)
    if (State.currentManga) {
        settingsFormContainer._imageFitSelect = createSelect({
            container: $("#image-fit-select-placeholder", settingsFormContainer),
            items: [
                { value: "original", text: "Original Size" },
                { value: "width", text: "Fit Width" },
                { value: "height", text: "Fit Height" },
            ],
            value: initialSettingsOnOpen.imageFit,
            onChange: applyCurrentZoom,
        });

        settingsFormContainer._progressBarPositionSelect = createSelect({
            container: $("#progress-bar-position-select-placeholder", settingsFormContainer),
            items: [
                { value: "top", text: "Top" },
                { value: "bottom", text: "Bottom" },
            ],
            value: initialSettingsOnOpen.progressBarPosition,
            onChange: (value) => applyProgressBarSettings({ progressBarPosition: value }),
        });

        settingsFormContainer._progressBarStyleSelect = createSelect({
            container: $("#progress-bar-style-select-placeholder", settingsFormContainer),
            items: [
                { value: "continuous", text: "Continuous" },
                { value: "discrete", text: "Discrete" },
            ],
            value: initialSettingsOnOpen.progressBarStyle,
            onChange: (value) => applyProgressBarSettings({ progressBarStyle: value }),
        });
    }

    // If a manga is loaded, create and inject the MangaForm
    if (State.currentManga) {
        const mangaDetailsPane = $("#settings-manga-details", settingsFormContainer);
        mangaDetailsPane.appendChild(createMangaFormElement(State.currentManga));
    }

    // Populate the form and set initial UI states
    populateSettingsForm();

    // Enable/disable manga-specific tabs
    setTimeout(() => toggleMangaSettingsTabs(!!State.currentManga), 0);

    showModal(SETTINGS_MODAL_ID, {
        title: "Settings",
        content: settingsFormContainer,
        size: "xl",
        buttons: [
            { text: "Cancel", type: "secondary", onClick: () => hideModal(SETTINGS_MODAL_ID) },
            { text: "Save Settings", type: "primary", id: "save-settings-btn", onClick: handleSettingsSave },
        ],
        onClose: handleModalClose,
        onOpen: handleModalOpen,
    });

    addEventListeners(settingsFormContainer);
}

function populateSettingsForm() {
    if (!settingsFormContainer) return;
    const currentSettings = loadCurrentSettings();
    settingsFormContainer._themeButtons?.setValue(currentSettings.themePreference);
    if (State.currentManga) {
        setSettingsToDOM(currentSettings, settingsFormContainer);
        updateDependentUI(settingsFormContainer);
    }
}

function updateDependentUI(container) {
    updateControlState(container, "#collapse-spacing-checkbox", ["#spacing-amount-input"], [], true);
    updateControlState(container, "#enable-progress-bar-checkbox", [".progress-bar-option"], [container._progressBarPositionSelect, container._progressBarStyleSelect]);
    updateControlState(container, "#enable-auto-scroll-checkbox", ["#auto-scroll-options"]);
}

function updateControlState(container, checkboxSelector, dependentSelectors, selectsToToggle = [], invertLogic = false) {
    const checkbox = $(checkboxSelector, container);
    if (!checkbox) return;
    let isEnabled = isChecked(checkbox);
    if (invertLogic) isEnabled = !isEnabled;

    dependentSelectors.forEach(selector => {
        const elements = $$(selector, container);
        elements.forEach(el => {
            const input = el.matches("input, button") ? el : el.querySelector("input, button");

            toggleClass(el, "opacity-50 cursor-not-allowed", !isEnabled);
            if (input) input.disabled = !isEnabled;
        });
    });

    selectsToToggle.forEach(select => {
        const button = select?.element?.querySelector(".select-btn");
        if (button) button.disabled = !isEnabled;
    });
}

function handleModalOpen() {
    renderIcons();
    document.addEventListener("theme-changed", handleExternalThemeChange);
}

function handleModalClose() {
    document.removeEventListener("theme-changed", handleExternalThemeChange);

    if (!settingsSaved) {
        applyTheme(initialSettingsOnOpen.themePreference);
        if (State.currentManga) {
            applySettings(initialSettingsOnOpen);
        }
    }

    // Destroy custom components
    settingsFormContainer?._themeButtons?.destroy();
    settingsFormContainer?._imageFitSelect?.destroy();
    settingsFormContainer?._progressBarPositionSelect?.destroy();
    settingsFormContainer?._progressBarStyleSelect?.destroy();

    settingsFormContainer = null;
    initialSettingsOnOpen = {};
    settingsSaved = false;
}

function addEventListeners(container) {
    $("#shortcuts-help-button", container)?.addEventListener("click", showShortcutsHelp);
    $("#reset-settings-button", container)?.addEventListener("click", handleResetSettings);

    if (State.currentManga) {
        $("#collapse-spacing-checkbox", container)?.addEventListener("change", () => updateDependentUI(container));
        $("#enable-progress-bar-checkbox", container)?.addEventListener("change", (e) => {
            updateDependentUI(container);
            applyProgressBarSettings({ progressBarEnabled: e.target.checked });
        });
        $("#enable-auto-scroll-checkbox", container)?.addEventListener("change", (e) => {
            updateDependentUI(container);
            if (!e.target.checked) stopAutoScroll();
        });
    }
}

const handleExternalThemeChange = (e) => {
    if (settingsFormContainer?._themeButtons) {
        settingsFormContainer._themeButtons.setValue(e.detail.themePreference);
    }
};

function handleSettingsSave() {
    if (!settingsFormContainer) return;

    // --- Save General Settings ---
    const newPreference = settingsFormContainer._themeButtons?.getValue() ?? "system";
    if (newPreference !== (State.themePreference || "system")) {
        State.update("themePreference", newPreference);
    } else {
        applyTheme(newPreference); // Re-apply system theme if needed
    }

    // --- Save Manga-Specific Settings ---
    if (State.currentManga) {
        const mangaId = State.currentManga.id;
        const newMangaSettings = getSettingsFromDOM(settingsFormContainer);

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $("#manga-form", settingsFormContainer);
        if (mangaForm) {
            const invalidInput = validateMangaForm(mangaForm);
            if (invalidInput) {
                switchSettingsTab("settings-manga-details");
                focusAndScrollToInvalidInput(invalidInput);
                return;
            }
            editManga(mangaId, getMangaFormData(mangaForm));
        }

        saveMangaSettings(mangaId, newMangaSettings);
        applySettings(newMangaSettings);
    }

    settingsSaved = true;
    hideModal(SETTINGS_MODAL_ID);
}

function handleResetSettings() {
    if (!confirm("Are you sure you want to reset all settings to their defaults? This action cannot be undone.")) {
        return;
    }

    // Reset general settings
    State.update("themePreference", "system");
    applyTheme("system");

    // Reset manga-specific settings
    if (State.currentManga) {
        const mangaId = State.currentManga.id;
        if (State.mangaSettings[mangaId]) {
            delete State.mangaSettings[mangaId];
            State.update("mangaSettings", State.mangaSettings);
        }
        // Apply default settings to the UI
        const defaultSettings = loadCurrentSettings();
        applySettings(defaultSettings);
    }

    populateSettingsForm();
}

export function saveMangaSettings(mangaId, settings) {
    if (!mangaId) return;
    State.mangaSettings[mangaId] = {
        ...(State.mangaSettings[mangaId] || {}),
        ...settings,
    };
    State.update("mangaSettings", State.mangaSettings);
}

export function updateMangaSetting(mangaId, key, value) {
    if (!mangaId) return;
    const currentSettings = State.mangaSettings[mangaId] || {};
    saveMangaSettings(mangaId, { ...currentSettings, [key]: value });
}

export function loadMangaSettings(mangaId) {
    if (!mangaId) return {};
    return { ...(State.mangaSettings[mangaId] || {}) };
}
