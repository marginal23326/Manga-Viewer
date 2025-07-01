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
let settingsFormContainer = null; // To hold the generated settings form
let initialSettingsOnOpen = {};
let settingsSaved = false;

const handleExternalThemeChange = (e) => {
    if (settingsFormContainer && settingsFormContainer._themeButtons) {
        const { themePreference } = e.detail;
        settingsFormContainer._themeButtons.setValue(themePreference);
    }
};

// --- Loading Settings ---
export function loadCurrentSettings() {
    const generalSettings = {
        themePreference: State.themePreference || "system",
    };
    let mangaSettings = {};
    if (State.currentManga) {
        mangaSettings = State.mangaSettings[State.currentManga.id] || {};
    }
    const defaults = {
        scrollAmount: Config.DEFAULT_SCROLL_AMOUNT,
        imageFit: Config.DEFAULT_IMAGE_FIT,
        spacingAmount: Config.DEFAULT_SPACING_AMOUNT,
        collapseSpacing: Config.DEFAULT_COLLAPSE_SPACING,
        progressBarEnabled: Config.DEFAULT_PROGRESS_BAR_ENABLED,
        progressBarPosition: Config.DEFAULT_PROGRESS_BAR_POSITION,
        progressBarStyle: Config.DEFAULT_PROGRESS_BAR_STYLE,
        autoScrollEnabled: Config.DEFAULT_AUTO_SCROLL_ENABLED,
        autoScrollSpeed: Config.DEFAULT_AUTO_SCROLL_SPEED,
    };
    return { ...generalSettings, ...defaults, ...mangaSettings };
}

// --- UI Interaction ---

export function openSettings() {
    settingsSaved = false;
    initialSettingsOnOpen = loadCurrentSettings();
    // 1. Create the main settings form structure
    settingsFormContainer = createSettingsFormElement();

    // 2. Create Theme Buttons
    const themeButtons = createThemeButtons({
        container: $("#theme-buttons-placeholder", settingsFormContainer),
        items: [
            { value: "light", text: "Light", icon: "Sun" },
            { value: "dark", text: "Dark", icon: "Moon" },
            { value: "system", text: "System", icon: "Laptop" },
        ],
        value: State.themePreference || "system",
        onChange: (value) => {
            applyTheme(value);
        },
    });

    // --- Create Manga-Specific Selects (if manga loaded) ---
    let imageFitSelect = null;
    let progressBarPositionSelect = null;
    let progressBarStyleSelect = null;

    if (State.currentManga) {
        imageFitSelect = createSelect({
            container: $("#image-fit-select-placeholder", settingsFormContainer),
            items: [
                { value: "original", text: "Original Size" },
                { value: "width", text: "Fit Width" },
                { value: "height", text: "Fit Height" },
            ],
            value: initialSettingsOnOpen.imageFit,
            onChange: (value) => {
                applyCurrentZoom(value);
            },
        });

        progressBarPositionSelect = createSelect({
            container: $("#progress-bar-position-select-placeholder", settingsFormContainer),
            items: [
                { value: "top", text: "Top" },
                { value: "bottom", text: "Bottom" },
            ],
            value: initialSettingsOnOpen.progressBarPosition,
            onChange: (value) => {
                applyProgressBarSettings({ progressBarPosition: value });
            },
        });

        progressBarStyleSelect = createSelect({
            container: $("#progress-bar-style-select-placeholder", settingsFormContainer),
            items: [
                { value: "continuous", text: "Continuous" },
                { value: "discrete", text: "Discrete" },
            ],
            value: initialSettingsOnOpen.progressBarStyle,
            onChange: (value) => {
                applyProgressBarSettings({ progressBarStyle: value });
            },
        });
    }

    settingsFormContainer._themeButtons = themeButtons;
    settingsFormContainer._imageFitSelect = imageFitSelect;
    settingsFormContainer._progressBarPositionSelect = progressBarPositionSelect;
    settingsFormContainer._progressBarStyleSelect = progressBarStyleSelect;

    // 3. If a manga is loaded, create and inject the MangaForm
    const mangaDetailsPane = $("#settings-manga-details", settingsFormContainer);
    if (State.currentManga && mangaDetailsPane) {
        const mangaFormElement = createMangaFormElement(State.currentManga);
        mangaDetailsPane.appendChild(mangaFormElement);
    }

    // 4. Populate the form with current settings
    populateSettingsForm();

    // 5. Enable/disable manga-specific tabs
    setTimeout(() => {
        toggleMangaSettingsTabs(!!State.currentManga);
    }, 0);

    // 6. Define modal buttons
    const modalButtons = [
        {
            text: "Cancel",
            type: "secondary",
            onClick: () => hideModal(SETTINGS_MODAL_ID),
        },
        {
            text: "Save Settings",
            type: "primary",
            id: "save-settings-btn",
            onClick: handleSettingsSave,
        },
    ];

    // 7. Show the modal
    showModal(SETTINGS_MODAL_ID, {
        title: "Settings",
        content: settingsFormContainer,
        size: "xl",
        buttons: modalButtons,
        onClose: () => {
            document.removeEventListener("theme-changed", handleExternalThemeChange);

            // Revert unsaved changes if modal closed without saving
            if (!settingsSaved) {
                applyTheme(initialSettingsOnOpen.themePreference);
                if (State.currentManga) {
                    applyCurrentZoom(initialSettingsOnOpen.imageFit);
                    applySpacing(initialSettingsOnOpen.spacingAmount, initialSettingsOnOpen.collapseSpacing);
                    applyProgressBarSettings({
                        progressBarEnabled: initialSettingsOnOpen.progressBarEnabled,
                        progressBarPosition: initialSettingsOnOpen.progressBarPosition,
                        progressBarStyle: initialSettingsOnOpen.progressBarStyle,
                    });
                }
            }
            // Destroy custom selects
            settingsFormContainer?._themeButtons?.destroy();
            settingsFormContainer?._imageFitSelect?.destroy();
            settingsFormContainer?._progressBarPositionSelect?.destroy();
            settingsFormContainer?._progressBarStyleSelect?.destroy();
            settingsFormContainer = null; // Clear reference
            initialSettingsOnOpen = {}; // Clear initial state
            settingsSaved = false; // Reset save flag
        },
        onOpen: () => {
            renderIcons();
            document.addEventListener("theme-changed", handleExternalThemeChange);
        },
    });

    // 8. Add listeners
    const shortcutsBtn = $("#shortcuts-help-button", settingsFormContainer);
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener("click", showShortcutsHelp);
    }

    const resetBtn = $("#reset-settings-button", settingsFormContainer);
    if (resetBtn) {
        resetBtn.addEventListener("click", handleResetSettings);
    }

    const collapseCheckbox = $("#collapse-spacing-checkbox", settingsFormContainer);
    if (collapseCheckbox) {
        collapseCheckbox.addEventListener("change", () => _updateSpacingInputState(settingsFormContainer));
    }

    const enableProgressBarCheckbox = $("#enable-progress-bar-checkbox", settingsFormContainer);
    if (enableProgressBarCheckbox) {
        enableProgressBarCheckbox.addEventListener("change", (e) => {
            _updateProgressBarOptionsState(settingsFormContainer);
            applyProgressBarSettings({ progressBarEnabled: e.target.checked });
        });
    }

    const enableAutoScrollCheckbox = $("#enable-auto-scroll-checkbox", settingsFormContainer);
    if (enableAutoScrollCheckbox) {
        enableAutoScrollCheckbox.addEventListener("change", (e) => {
            _updateAutoScrollOptionsState(settingsFormContainer);
            if (!e.target.checked) {
                stopAutoScroll();
            }
        });
    }
}

// Populates the form fields within the settings modal
function populateSettingsForm() {
    if (!settingsFormContainer) return;

    const currentSettings = loadCurrentSettings();

    // General Tab - Use custom buttons API
    settingsFormContainer._themeButtons?.setValue(currentSettings.themePreference);

    if (State.currentManga) {
        setValue($("#scroll-amount-input", settingsFormContainer), currentSettings.scrollAmount);
        settingsFormContainer._imageFitSelect?.setValue(currentSettings.imageFit);
        setValue($("#spacing-amount-input", settingsFormContainer), currentSettings.spacingAmount);
        setChecked($("#collapse-spacing-checkbox", settingsFormContainer), currentSettings.collapseSpacing);

        // Progress Bar Settings
        setChecked($("#enable-progress-bar-checkbox", settingsFormContainer), currentSettings.progressBarEnabled);
        settingsFormContainer._progressBarPositionSelect?.setValue(currentSettings.progressBarPosition);
        settingsFormContainer._progressBarStyleSelect?.setValue(currentSettings.progressBarStyle);

        // Auto Scroll Settings
        setChecked($("#enable-auto-scroll-checkbox", settingsFormContainer), currentSettings.autoScrollEnabled);
        setValue($("#auto-scroll-speed-input", settingsFormContainer), currentSettings.autoScrollSpeed);

        // Update enabled/disabled states based on checkboxes (only if manga loaded)
        _updateSpacingInputState(settingsFormContainer);
        _updateProgressBarOptionsState(settingsFormContainer);
        _updateAutoScrollOptionsState(settingsFormContainer);
    }
}

// Enable/disable spacing input based on checkbox
function _updateSpacingInputState(container) {
    const collapseCheckbox = $("#collapse-spacing-checkbox", container);
    const spacingInput = $("#spacing-amount-input", container);
    if (collapseCheckbox && spacingInput) {
        spacingInput.disabled = isChecked(collapseCheckbox);
    }
}

// Enable/disable progress bar options based on checkbox
function _updateProgressBarOptionsState(container) {
    const enableCheckbox = $("#enable-progress-bar-checkbox", container);
    const positionSelect = container._progressBarPositionSelect;
    const styleSelect = container._progressBarStyleSelect;
    const optionsDivs = $$(".progress-bar-option", container);

    const isEnabled = isChecked(enableCheckbox);

    // Enable/disable the underlying button elements of the select components
    const positionButton = positionSelect?.element?.querySelector(".select-btn");
    const styleButton = styleSelect?.element?.querySelector(".select-btn");

    if (positionButton) positionButton.disabled = !isEnabled;
    if (styleButton) styleButton.disabled = !isEnabled;

    if (optionsDivs && optionsDivs.length) {
        optionsDivs.forEach(div => toggleClass(div, "opacity-50 cursor-not-allowed", !isEnabled));
    }
}

// Enable/disable auto scroll options based on checkbox
function _updateAutoScrollOptionsState(container) {
    const enableCheckbox = $("#enable-auto-scroll-checkbox", container);
    const optionsDiv = $("#auto-scroll-options", container);
    if (!enableCheckbox || !optionsDiv) return;

    const isEnabled = isChecked(enableCheckbox);
    const speedInput = $("#auto-scroll-speed-input", optionsDiv);

    if (speedInput) {
        speedInput.disabled = !isEnabled;
    }
    toggleClass(optionsDiv, "opacity-50 cursor-not-allowed", !isEnabled);
}

function handleSettingsSave() {
    if (!settingsFormContainer) return;

    // --- Save General Settings ---
    const newPreference = settingsFormContainer._themeButtons?.getValue() ?? "system";
    const currentSavedPreference = State.themePreference || "system";

    if (newPreference !== currentSavedPreference) {
        State.update("themePreference", newPreference);
    } else {
        applyTheme(newPreference); // Re-apply system theme if needed
    }

    // --- Save Manga-Specific Settings (if a manga is loaded) ---
    if (State.currentManga) {
        const mangaId = State.currentManga.id;
        const currentMangaSettings = State.mangaSettings[mangaId] || {};

        // Navigation Settings
        const scrollAmount = parseInt(getValue($("#scroll-amount-input", settingsFormContainer)), 10) || Config.DEFAULT_SCROLL_AMOUNT;

        // Display Settings
        const imageFit = settingsFormContainer._imageFitSelect?.getValue() ?? Config.DEFAULT_IMAGE_FIT;
        const spacingAmount = parseInt(getValue($("#spacing-amount-input", settingsFormContainer)), 10) ?? Config.DEFAULT_SPACING_AMOUNT;
        const collapseSpacing = isChecked($("#collapse-spacing-checkbox", settingsFormContainer));

        // Progress Bar Settings
        const progressBarEnabled = isChecked($("#enable-progress-bar-checkbox", settingsFormContainer));
        const progressBarPosition = settingsFormContainer._progressBarPositionSelect?.getValue() ?? Config.DEFAULT_PROGRESS_BAR_POSITION;
        const progressBarStyle = settingsFormContainer._progressBarStyleSelect?.getValue() ?? Config.DEFAULT_PROGRESS_BAR_STYLE;

        // Auto Scroll Settings
        const autoScrollEnabled = isChecked($("#enable-auto-scroll-checkbox", settingsFormContainer));
        const autoScrollSpeed = parseInt(getValue($("#auto-scroll-speed-input", settingsFormContainer)), 10) || Config.DEFAULT_AUTO_SCROLL_SPEED;

        const newMangaSettings = {
            ...currentMangaSettings,
            scrollAmount,
            imageFit,
            spacingAmount,
            collapseSpacing,
            progressBarEnabled,
            progressBarPosition,
            progressBarStyle,
            autoScrollEnabled,
            autoScrollSpeed,
        };

        // Save if changed
        if (JSON.stringify(newMangaSettings) !== JSON.stringify(currentMangaSettings)) {
            saveMangaSettings(mangaId, newMangaSettings);
        }

        applyProgressBarSettings({
            progressBarEnabled,
            progressBarPosition,
            progressBarStyle,
        });

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $("#manga-form", settingsFormContainer);
        if (mangaForm) {
            const invalidInput = validateMangaForm(mangaForm);
            if (invalidInput) {
                switchSettingsTab("settings-manga-details");
                focusAndScrollToInvalidInput(invalidInput);
                return;
            } else {
                const mangaFormData = getMangaFormData(mangaForm);
                editManga(mangaId, mangaFormData);
            }
        }

        // If auto-scroll was enabled, start or restart it.
        if (newMangaSettings.autoScrollEnabled) {
            // If it's already running, stop it first to apply new speed.
            if (State.isAutoScrolling) {
                stopAutoScroll();
            }
            startAutoScroll();
        } else {
            stopAutoScroll();
        }
    }
    settingsSaved = true;
    hideModal(SETTINGS_MODAL_ID);
}

function handleResetSettings() {
    if (!confirm("Are you sure you want to reset all settings to their defaults? This action cannot be undone.")) {
        return;
    }

    State.update("themePreference", "system");
    applyTheme("system");

    if (State.currentManga) {
        const mangaId = State.currentManga.id;
        if (State.mangaSettings[mangaId]) {
            delete State.mangaSettings[mangaId];
            State.update("mangaSettings", State.mangaSettings);
        }

        populateSettingsForm();

        const defaultSettings = loadCurrentSettings();
        applyCurrentZoom(defaultSettings.imageFit);
        applySpacing(defaultSettings.spacingAmount, defaultSettings.collapseSpacing);
        applyProgressBarSettings({
            progressBarEnabled: defaultSettings.progressBarEnabled,
            progressBarPosition: defaultSettings.progressBarPosition,
            progressBarStyle: defaultSettings.progressBarStyle,
        });
        stopAutoScroll();
    } else {
        populateSettingsForm();
    }
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
