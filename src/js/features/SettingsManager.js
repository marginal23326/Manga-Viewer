import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { DOM, $, setValue, getValue, setChecked, isChecked } from '../core/DOMUtils';
import { showModal, hideModal } from '../components/Modal';
import { createSettingsFormElement, toggleMangaSettingsTabs } from './SettingsForm';
import { createMangaFormElement, getMangaFormData, validateMangaForm } from './MangaForm';
import { applyTheme } from '../ui/ThemeManager'; // For theme change
import { editManga } from './MangaManager'; // To save manga details changes
import { applyCurrentZoom, applySpacing } from './ZoomManager'; // To apply display changes
import { showShortcutsHelp } from '../ui/Shortcuts'; // Will create Shortcuts later

const SETTINGS_MODAL_ID = 'settings-modal';
let settingsFormContainer = null; // To hold the generated settings form

// --- Loading Settings ---

// Loads combined settings (general + manga-specific if available)
export function loadCurrentSettings() {
    // Load the saved theme preference, defaulting to 'system'
    const generalSettings = {
        themePreference: AppState.themePreference || 'system',
    };

    let mangaSettings = {};
    if (AppState.currentManga) {
        mangaSettings = AppState.mangaSettings[AppState.currentManga.id] || {};
    }

    // Provide defaults for manga-specific settings if missing
    const defaults = {
        scrollAmount: Config.DEFAULT_SCROLL_AMOUNT,
        imageFit: Config.DEFAULT_IMAGE_FIT,
        spacingAmount: Config.DEFAULT_SPACING_AMOUNT,
        collapseSpacing: Config.DEFAULT_COLLAPSE_SPACING,
        // Note: zoomLevel is handled by ZoomManager, currentChapter by ImageManager
    };

    return { ...generalSettings, ...defaults, ...mangaSettings };
}

// --- UI Interaction ---

export function openSettings() {
    // 1. Create the main settings form structure (tabs, panes)
    settingsFormContainer = createSettingsFormElement();

    // 2. If a manga is loaded, create and inject the MangaForm into its pane
    const mangaDetailsPane = $('#settings-manga-details', settingsFormContainer);
    if (AppState.currentManga && mangaDetailsPane) {
        const mangaFormElement = createMangaFormElement(AppState.currentManga);
        mangaDetailsPane.appendChild(mangaFormElement);
    }

    // 3. Populate the form with current settings
    populateSettingsForm();

    // 4. Enable/disable manga-specific tabs based on context
    setTimeout(() => {
        toggleMangaSettingsTabs(!!AppState.currentManga);
    }, 0);

    // 5. Define modal buttons
    const modalButtons = [
        { text: 'Cancel', type: 'secondary', onClick: () => hideModal(SETTINGS_MODAL_ID) },
        { text: 'Save Settings', type: 'primary', id: 'save-settings-btn', onClick: handleSettingsSave }
    ];

    // 6. Show the modal
    showModal(SETTINGS_MODAL_ID, {
        title: 'Settings',
        content: settingsFormContainer, // Add the container with tabs/panes
        size: 'xl', // Use a larger modal for settings
        buttons: modalButtons,
        onClose: () => { settingsFormContainer = null; } // Cleanup reference on close
    });

    // 7. Add listener for shortcuts button *after* modal is shown
    const shortcutsBtn = $('#shortcuts-help-button', settingsFormContainer);
    if (shortcutsBtn) {
        // Remove previous listener if any (safer if modal is reopened)
        shortcutsBtn.replaceWith(shortcutsBtn.cloneNode(true)); // Clone to remove listeners
        $('#shortcuts-help-button', settingsFormContainer)
            .addEventListener('click', showShortcutsHelp); // Add listener to new button
    }
}

// Populates the form fields within the settings modal
function populateSettingsForm() {
    if (!settingsFormContainer) return;

    const currentSettings = loadCurrentSettings();

    // General Tab - Use themePreference
    setValue($('#theme-select', settingsFormContainer), currentSettings.themePreference);

    // Navigation Tab (only if manga loaded)
    if (AppState.currentManga) {
        setValue($('#scroll-amount-input', settingsFormContainer), currentSettings.scrollAmount);
    }

    // Display Tab (only if manga loaded)
    if (AppState.currentManga) {
        setValue($('#image-fit-select', settingsFormContainer), currentSettings.imageFit);
        setValue($('#spacing-amount-input', settingsFormContainer), currentSettings.spacingAmount);
        setChecked($('#collapse-spacing-checkbox', settingsFormContainer), currentSettings.collapseSpacing);
    }

    // Manga Details tab is populated by createMangaFormElement
}

// Handles saving settings when the "Save Settings" button is clicked
function handleSettingsSave() {
    if (!settingsFormContainer) return;

    // --- Save General Settings ---
    const newPreference = getValue($('#theme-select', settingsFormContainer)); // 'light', 'dark', or 'system'
    // Only save if the preference changed
    if (newPreference !== (AppState.themePreference || 'system')) {
        applyTheme(newPreference); // Apply based on the new preference
        AppState.update('themePreference', newPreference); // Save the preference to localStorage
    } else {
        // If preference is 'system' and hasn't changed, still might need to apply theme
        // in case OS changed while modal was open (applyTheme handles the logic)
        applyTheme(newPreference);
    }


    // --- Save Manga-Specific Settings (if a manga is loaded) ---
    if (AppState.currentManga) {
        const mangaId = AppState.currentManga.id;
        const currentMangaSettings = AppState.mangaSettings[mangaId] || {};

        // Navigation Settings
        const scrollAmount = parseInt(getValue($('#scroll-amount-input', settingsFormContainer)), 10) || Config.DEFAULT_SCROLL_AMOUNT;

        // Display Settings
        const imageFit = getValue($('#image-fit-select', settingsFormContainer)) || Config.DEFAULT_IMAGE_FIT;
        const spacingAmount = parseInt(getValue($('#spacing-amount-input', settingsFormContainer)), 10) ?? Config.DEFAULT_SPACING_AMOUNT; // Allow 0
        const collapseSpacing = isChecked($('#collapse-spacing-checkbox', settingsFormContainer));

        const newMangaSettings = {
            ...currentMangaSettings, // Preserve existing settings like zoom, chapter, scrollPos
            scrollAmount,
            imageFit,
            spacingAmount,
            collapseSpacing,
        };
        saveMangaSettings(mangaId, newMangaSettings); // Saves to AppState.mangaSettings and localStorage

        // Apply relevant display settings immediately
        applySpacing(); // From ZoomManager
        applyCurrentZoom(); // From ZoomManager (reapplies based on new imageFit)

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $('#manga-form', settingsFormContainer);
        if (mangaForm) {
            if (validateMangaForm(mangaForm)) {
                const mangaFormData = getMangaFormData(mangaForm);
                editManga(mangaId, mangaFormData); // Use MangaManager to handle update and recalculations
            } else {
                console.warn("Manga details form invalid, not saved.");
                // Optionally prevent modal close or show error
                // return; // Uncomment to prevent closing if manga details are invalid
            }
        }
    }

    hideModal(SETTINGS_MODAL_ID);
}

// Saves only the manga-specific settings (e.g., scroll position, zoom)
// Called internally by other managers
export function saveMangaSettings(mangaId, settings) {
    if (!mangaId) return;
    AppState.mangaSettings[mangaId] = {
        ...(AppState.mangaSettings[mangaId] || {}), // Merge with existing
        ...settings
    };
    // Trigger state update for the whole settings object to save to localStorage
    AppState.update('mangaSettings', AppState.mangaSettings);
}

// Loads only the manga-specific settings
export function loadMangaSettings(mangaId) {
    if (!mangaId) return {};
    // Return a copy to prevent direct mutation of AppState
    return { ...(AppState.mangaSettings[mangaId] || {}) };
}