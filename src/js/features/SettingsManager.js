import { $, $$, getValue, isChecked, setChecked, setValue, toggleClass } from "../core/DOMUtils";
import { applySettings, loadCurrentSettings, mangaSettingConfig } from "./ViewerSettingsRuntime";
import {
    createMangaFormElement,
    focusAndScrollToInvalidInput,
    getMangaFormData,
    showFormError,
    validateMangaForm,
} from "./MangaForm";
import { createSettingsFormElement, switchSettingsTab, toggleMangaSettingsTabs } from "./SettingsForm";
import { getCurrentManga, withCurrentManga } from "../state/MangaLibrary";
import { hideModal, showModal } from "../components/Modal";
import { AppEvents } from "../core/AppEvents";
import { PersistState } from "../state/State";
import { applyCurrentZoom } from "./ZoomManager";
import { applyProgressBarSettings } from "./ProgressBar";
import { applyTheme } from "../ui/ThemeManager";
import { createSelect } from "../components/CustomSelect";
import { createThemeButtons } from "../components/ThemeButtons";
import { editManga } from "./MangaManager";
import { renderIcons } from "../core/icons";
import { setNavBarEnabled } from "./NavigationManager";
import { setScrubberEnabled } from "./ScrubberManager";
import { showShortcutsHelp } from "../ui/ShortcutsHelp";
import { stopAutoScroll } from "./AutoScroll";
import { updateSettings } from "../state/MangaSettings";

const SETTINGS_MODAL_ID = "settings-modal";
let settingsFormContainer = null;
let initialSettingsOnOpen = {};
let settingsSaved = false;

// --- Generic Setting Helpers ---

function getSettingsFromDOM(container) {
    const settings = {};
    for (const [key, config] of Object.entries(mangaSettingConfig)) {
        if (config.type === "select") {
            settings[key] = container[`_${key}Select`]?.getValue() ?? config.defaultValue;
        } else {
            const element = $(`#${config.id}`, container);
            if (element) {
                switch (config.type) {
                    case "input": {
                        settings[key] = Math.trunc(Number(getValue(element))) || config.defaultValue;
                        break;
                    }
                    case "checkbox": {
                        settings[key] = isChecked(element);
                        break;
                    }
                }
            }
        }
    }
    return settings;
}

function setSettingsToDOM(settings, container) {
    for (const [key, config] of Object.entries(mangaSettingConfig)) {
        if (config.type === "select") {
            container[`_${key}Select`]?.setValue(settings[key]);
        } else {
            const element = $(`#${config.id}`, container);
            if (element) {
                switch (config.type) {
                    case "input": {
                        setValue(element, settings[key]);
                        break;
                    }
                    case "checkbox": {
                        setChecked(element, settings[key]);
                        break;
                    }
                }
            }
        }
    }
}

// --- UI Interaction ---

export function openSettings() {
    settingsSaved = false;
    initialSettingsOnOpen = loadCurrentSettings();
    settingsFormContainer = createSettingsFormElement();
    const currentManga = getCurrentManga();

    // Create Theme Buttons
    settingsFormContainer._themeButtons = createThemeButtons({
        container: $("#theme-buttons-placeholder", settingsFormContainer),
        items: [
            { icon: "Sun", text: "Light", value: "light" },
            { icon: "Moon", text: "Dark", value: "dark" },
            { icon: "Laptop", text: "System", value: "system" },
        ],
        onChange: applyTheme,
        value: initialSettingsOnOpen.themePreference,
    });

    // Create Manga-Specific Selects (if manga loaded)
    if (currentManga) {
        settingsFormContainer._imageFitSelect = createSelect({
            container: $("#image-fit-select-placeholder", settingsFormContainer),
            items: [
                { text: "Original Size", value: "original" },
                { text: "Fit Width", value: "width" },
                { text: "Fit Height", value: "height" },
            ],
            onChange: applyCurrentZoom,
            value: initialSettingsOnOpen.imageFit,
        });

        settingsFormContainer._progressBarPositionSelect = createSelect({
            container: $("#progress-bar-position-select-placeholder", settingsFormContainer),
            items: [
                { text: "Top", value: "top" },
                { text: "Bottom", value: "bottom" },
            ],
            onChange: (value) => applyProgressBarSettings({ progressBarPosition: value }),
            value: initialSettingsOnOpen.progressBarPosition,
        });

        settingsFormContainer._progressBarStyleSelect = createSelect({
            container: $("#progress-bar-style-select-placeholder", settingsFormContainer),
            items: [
                { text: "Continuous", value: "continuous" },
                { text: "Discrete", value: "discrete" },
            ],
            onChange: (value) => applyProgressBarSettings({ progressBarStyle: value }),
            value: initialSettingsOnOpen.progressBarStyle,
        });
    }

    // If a manga is loaded, create and inject the MangaForm
    if (currentManga) {
        const mangaDetailsPane = $("#settings-manga-details", settingsFormContainer);
        mangaDetailsPane.append(createMangaFormElement(currentManga));
    }

    // Populate the form and set initial UI states
    populateSettingsForm();

    // Enable/disable manga-specific tabs
    setTimeout(() => toggleMangaSettingsTabs(Boolean(currentManga)), 0);

    showModal(SETTINGS_MODAL_ID, {
        buttons: [
            { onClick: () => hideModal(SETTINGS_MODAL_ID), text: "Cancel", type: "secondary" },
            { id: "save-settings-btn", onClick: handleSettingsSave, text: "Save Settings", type: "primary" },
        ],
        content: settingsFormContainer,
        errorElementId: "settings-form-error",
        onClose: handleModalClose,
        onOpen: handleModalOpen,
        size: "xl",
        title: "Settings",
    });

    addEventListeners(settingsFormContainer);
}

function populateSettingsForm() {
    if (!settingsFormContainer) return;
    const currentSettings = loadCurrentSettings();
    settingsFormContainer._themeButtons?.setValue(currentSettings.themePreference);

    withCurrentManga(() => {
        setSettingsToDOM(currentSettings, settingsFormContainer);
        updateDependentUI(settingsFormContainer);
    });
}

function updateDependentUI(container) {
    syncControl(container, {
        checkbox: "#collapse-spacing-checkbox",
        dependents: ["#spacing-amount-input"],
        invert: true,
    });
    syncControl(container, {
        checkbox: "#enable-progress-bar-checkbox",
        dependents: [".progress-bar-option"],
        selects: [container._progressBarPositionSelect, container._progressBarStyleSelect],
    });
    syncControl(container, {
        checkbox: "#enable-auto-scroll-checkbox",
        dependents: ["#auto-scroll-options"],
    });
}

function syncControl(container, { checkbox, dependents = [], selects = [], invert = false }) {
    const checkboxEl = $(checkbox, container);
    if (!checkboxEl) return;
    const isEnabled = invert ? !isChecked(checkboxEl) : isChecked(checkboxEl);

    dependents.forEach((selector) => {
        $$(selector, container).forEach((el) => {
            const input = el.matches("input, button") ? el : $("input, button", el);

            toggleClass(el, "opacity-50 cursor-not-allowed", !isEnabled);
            if (input) input.disabled = !isEnabled;
        });
    });

    selects.forEach((select) => {
        const button = select?.element ? $(".select-btn", select.element) : null;
        if (button) button.disabled = !isEnabled;
    });
}

function handleModalOpen() {
    renderIcons();
    AppEvents.addEventListener("themeChanged", handleExternalThemeChange);
}

function handleModalClose() {
    AppEvents.removeEventListener("themeChanged", handleExternalThemeChange);

    if (!settingsSaved) {
        applyTheme(initialSettingsOnOpen.themePreference);
        withCurrentManga(() => {
            applySettings(initialSettingsOnOpen);
        });
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

    withCurrentManga(() => {
        $("#collapse-spacing-checkbox", container)?.addEventListener("change", () => updateDependentUI(container));
        $("#enable-progress-bar-checkbox", container)?.addEventListener("change", (e) => {
            updateDependentUI(container);
            applyProgressBarSettings({ progressBarEnabled: e.target.checked });
        });
        $("#enable-auto-scroll-checkbox", container)?.addEventListener("change", (e) => {
            updateDependentUI(container);
            if (!e.target.checked) stopAutoScroll();
        });
        $("#enable-scrubber-checkbox", container)?.addEventListener("change", (e) => {
            setScrubberEnabled(e.target.checked);
        });
        $("#enable-nav-bar-checkbox", container)?.addEventListener("change", (e) => {
            setNavBarEnabled(e.target.checked);
        });
    });
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
    if (newPreference === (PersistState.themePreference || "system")) {
        // Re-apply in case the OS/system theme changed.
        applyTheme(newPreference);
    } else {
        PersistState.update("themePreference", newPreference);
    }

    // --- Save Manga-Specific Settings ---
    const mangaSaveResult = withCurrentManga((currentManga) => {
        const mangaId = currentManga.id;
        const newMangaSettings = getSettingsFromDOM(settingsFormContainer);

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $("#manga-form", settingsFormContainer);
        if (mangaForm) {
            const invalidInput = validateMangaForm(mangaForm);
            if (invalidInput) {
                switchSettingsTab("settings-manga-details");
                focusAndScrollToInvalidInput(invalidInput);
                showFormError("settings-form-error", invalidInput);
                return false;
            }
            editManga(mangaId, getMangaFormData(mangaForm));
        }

        showFormError("settings-form-error");
        updateSettings(mangaId, newMangaSettings);
        applySettings(newMangaSettings);
        return true;
    });

    if (mangaSaveResult === false) {
        return;
    }

    settingsSaved = true;
    hideModal(SETTINGS_MODAL_ID);
}

function handleResetSettings() {
    if (!confirm("Are you sure you want to reset all settings to their defaults? This action cannot be undone.")) {
        return;
    }

    // Reset general settings
    PersistState.update("themePreference", "system");
    applyTheme("system");

    // Reset manga-specific settings
    withCurrentManga((currentManga) => {
        const mangaId = currentManga.id;
        if (PersistState.mangaSettings[mangaId]) {
            const remainingSettings = { ...PersistState.mangaSettings };
            delete remainingSettings[mangaId];
            PersistState.update("mangaSettings", remainingSettings);
        }
        // Apply default settings to the UI
        const defaultSettings = loadCurrentSettings();
        applySettings(defaultSettings);
    });

    populateSettingsForm();
}
