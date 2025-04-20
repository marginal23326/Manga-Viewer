import { AppState } from "../core/AppState";
import Config from "../core/Config";
import { DOM, $, setValue, getValue, setChecked, isChecked } from "../core/DOMUtils";
import { showModal, hideModal } from "../components/Modal";
import { createSettingsFormElement, toggleMangaSettingsTabs, switchSettingsTab } from "./SettingsForm";
import { createMangaFormElement, getMangaFormData, validateMangaForm, focusAndScrollToInvalidInput } from "./MangaForm";
import { applyTheme } from "../ui/ThemeManager";
import { editManga } from "./MangaManager";
import { applyCurrentZoom, applySpacing } from "./ZoomManager";
import { showShortcutsHelp } from "../ui/Shortcuts";
import { createSelect } from "../components/CustomSelect";
import { renderIcons } from "../core/icons";

const SETTINGS_MODAL_ID = "settings-modal";
let settingsFormContainer = null; // To hold the generated settings form
let initialSettingsOnOpen = {};
let settingsSaved = false;

// --- Loading Settings ---
export function loadCurrentSettings() {
    const generalSettings = {
        themePreference: AppState.themePreference || "system",
    };
    let mangaSettings = {};
    if (AppState.currentManga) {
        mangaSettings = AppState.mangaSettings[AppState.currentManga.id] || {};
    }
    const defaults = {
        scrollAmount: Config.DEFAULT_SCROLL_AMOUNT,
        imageFit: Config.DEFAULT_IMAGE_FIT,
        spacingAmount: Config.DEFAULT_SPACING_AMOUNT,
        collapseSpacing: Config.DEFAULT_COLLAPSE_SPACING,
    };
    return { ...generalSettings, ...defaults, ...mangaSettings };
}

// --- UI Interaction ---

export function openSettings() {
    settingsSaved = false;
    initialSettingsOnOpen = loadCurrentSettings();
    // 1. Create the main settings form structure
    settingsFormContainer = createSettingsFormElement();

    // 2. Create Custom Selects
    const themeSelect = createSelect({
        container: $("#theme-select-placeholder", settingsFormContainer),
        items: [
            { value: "system", text: "System" },
            { value: "light", text: "Light" },
            { value: "dark", text: "Dark" },
        ],
        value: AppState.themePreference || "system",
        onChange: (value) => {
            applyTheme(value);
        },
    });

    const imageFitSelect = createSelect({
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

    settingsFormContainer._themeSelect = themeSelect;
    settingsFormContainer._imageFitSelect = imageFitSelect;

    // 3. If a manga is loaded, create and inject the MangaForm
    const mangaDetailsPane = $("#settings-manga-details", settingsFormContainer);
    if (AppState.currentManga && mangaDetailsPane) {
        const mangaFormElement = createMangaFormElement(AppState.currentManga);
        mangaDetailsPane.appendChild(mangaFormElement);
    }

    // 4. Populate the form with current settings
    populateSettingsForm();

    // 5. Enable/disable manga-specific tabs
    setTimeout(() => {
        toggleMangaSettingsTabs(!!AppState.currentManga);
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
            if (!settingsSaved) {
                applyTheme(initialSettingsOnOpen.themePreference);
                applyCurrentZoom(initialSettingsOnOpen.imageFit);
            }
            settingsFormContainer?._themeSelect?.destroy();
            settingsFormContainer?._imageFitSelect?.destroy();
            settingsFormContainer = null;
            initialSettingsOnOpen = {};
            settingsSaved = false;
        },
        onOpen: () => {
            renderIcons();
        },
    });

    // 8. Add listeners
    const shortcutsBtn = $("#shortcuts-help-button", settingsFormContainer);
    if (shortcutsBtn) {
        shortcutsBtn.replaceWith(shortcutsBtn.cloneNode(true)); // Clone to remove listeners
        $("#shortcuts-help-button", settingsFormContainer).addEventListener("click", showShortcutsHelp);
    }

    const collapseCheckbox = $("#collapse-spacing-checkbox", settingsFormContainer);
    if (collapseCheckbox) {
        collapseCheckbox.addEventListener("change", () => _updateSpacingInputState(settingsFormContainer));
    }
}

// Populates the form fields within the settings modal
function populateSettingsForm() {
    if (!settingsFormContainer) return;

    const currentSettings = loadCurrentSettings();

    // General Tab - Use custom select API
    settingsFormContainer._themeSelect?.setValue(currentSettings.themePreference);

    // Navigation Tab (only if manga loaded)
    if (AppState.currentManga) {
        setValue($("#scroll-amount-input", settingsFormContainer), currentSettings.scrollAmount);
    }

    // Display Tab (only if manga loaded)
    if (AppState.currentManga) {
        settingsFormContainer._imageFitSelect?.setValue(currentSettings.imageFit);
        setValue($("#spacing-amount-input", settingsFormContainer), currentSettings.spacingAmount);
        setChecked($("#collapse-spacing-checkbox", settingsFormContainer), currentSettings.collapseSpacing);
    }

    _updateSpacingInputState(settingsFormContainer);
}

// Enable/disable spacing input based on checkbox
function _updateSpacingInputState(container) {
    const collapseCheckbox = $("#collapse-spacing-checkbox", container);
    const spacingInput = $("#spacing-amount-input", container);
    if (collapseCheckbox && spacingInput) {
        spacingInput.disabled = collapseCheckbox.checked;
    }
}

// Handles saving settings when the "Save Settings" button is clicked
function handleSettingsSave() {
    if (!settingsFormContainer) return;

    // --- Save General Settings ---
    const newPreference = settingsFormContainer._themeSelect?.getValue() ?? "system";
    const currentSavedPreference = AppState.themePreference || "system";

    if (newPreference !== currentSavedPreference) {
        AppState.update("themePreference", newPreference);
    } else {
        applyTheme(newPreference); // Re-apply system theme if needed
    }

    // --- Save Manga-Specific Settings (if a manga is loaded) ---
    if (AppState.currentManga) {
        const mangaId = AppState.currentManga.id;
        const currentMangaSettings = AppState.mangaSettings[mangaId] || {};

        // Navigation Settings
        const scrollAmount = parseInt(getValue($("#scroll-amount-input", settingsFormContainer)), 10) || Config.DEFAULT_SCROLL_AMOUNT;

        // Display Settings
        const imageFit = settingsFormContainer._imageFitSelect?.getValue() ?? Config.DEFAULT_IMAGE_FIT;
        const spacingAmount = parseInt(getValue($("#spacing-amount-input", settingsFormContainer)), 10) ?? Config.DEFAULT_SPACING_AMOUNT;
        const collapseSpacing = isChecked($("#collapse-spacing-checkbox", settingsFormContainer));

        const newMangaSettings = {
            ...currentMangaSettings,
            scrollAmount,
            imageFit,
            spacingAmount,
            collapseSpacing,
        };
        if (JSON.stringify(newMangaSettings) !== JSON.stringify(currentMangaSettings)) {
            saveMangaSettings(mangaId, newMangaSettings);
        }

        // Apply relevant display settings immediately
        applySpacing();
        applyCurrentZoom();

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
    }
    settingsSaved = true;
    hideModal(SETTINGS_MODAL_ID);
}

export function saveMangaSettings(mangaId, settings) {
    if (!mangaId) return;
    AppState.mangaSettings[mangaId] = {
        ...(AppState.mangaSettings[mangaId] || {}),
        ...settings,
    };
    AppState.update("mangaSettings", AppState.mangaSettings);
}

export function loadMangaSettings(mangaId) {
    if (!mangaId) return {};
    return { ...(AppState.mangaSettings[mangaId] || {}) };
}
