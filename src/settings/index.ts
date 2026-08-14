import { $, $$, getValue, isChecked, setChecked, setValue, toggleClass } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, ResolvedSettings } from "@/types";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { type SettingDefinition, applySettings, loadCurrentSettings, mangaSettingConfig } from "./runtime";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { createMangaFormElement, getMangaFormData, showFormError, validateAndReport } from "@/library/manga-form";
import { createSettingsFormElement, switchSettingsTab, toggleMangaSettingsTabs } from "./form";
import { getCurrentManga, withCurrentManga } from "@/state/manga-library";
import { hideModal, showModal } from "@/components/modal";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import { PersistState } from "@/state";
import { applyTheme } from "@/app/theme";
import { editManga } from "@/library/manga-actions";
import { showShortcutsHelp } from "@/app/shortcuts-help";
import { stopAutoScroll } from "@/viewer/auto-scroll";
import { toInt } from "@/core/utils";
import { updateSettings } from "@/state/manga-settings";

const SETTINGS_MODAL_ID = "settings-modal";
let settingsFormContainer: HTMLElement | null = null;
let initialSettingsOnOpen: ResolvedSettings = {} as ResolvedSettings;
let settingsSaved = false;

let selectInstances: Partial<Record<keyof ConfiguredMangaSettings, SelectInstance>> = {};
let themeButtons: ThemeButtonsInstance | undefined;

function livePreview<K extends keyof ConfiguredMangaSettings>(key: K, value: ConfiguredMangaSettings[K]): void {
    if (!settingsFormContainer) return;
    mangaSettingConfig[key].apply?.(value, getSettingsFromDOM(settingsFormContainer));
}

// --- Generic Setting Helpers ---

function getSettingsFromDOM(container: HTMLElement): ConfiguredMangaSettings {
    const settings = {} as Partial<Record<keyof ConfiguredMangaSettings, unknown>>;

    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key] as SettingDefinition<unknown>;

        if (config.type === "select") {
            settings[key] = selectInstances[key]?.getValue() ?? config.defaultValue;
        } else {
            const element = $<HTMLInputElement>(`#${config.id}`, container);
            if (element) {
                if (config.type === "input") {
                    settings[key] = toInt(getValue(element)) || config.defaultValue;
                } else if (config.type === "checkbox") {
                    settings[key] = isChecked(element);
                }
            }
        }
    }

    return settings as ConfiguredMangaSettings;
}

function setSettingsToDOM(settings: ConfiguredMangaSettings, container: HTMLElement): void {
    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key];
        const value = settings[key];

        if (config.type === "select") {
            selectInstances[key]?.setValue(String(value));
        } else {
            const element = $<HTMLInputElement>(`#${config.id}`, container);
            if (element) {
                if (config.type === "input") {
                    setValue(element, value as number);
                } else if (config.type === "checkbox") {
                    setChecked(element, value as boolean);
                }
            }
        }
    }
}

// --- UI Interaction ---

export function openSettings(): void {
    settingsSaved = false;
    initialSettingsOnOpen = loadCurrentSettings();
    settingsFormContainer = createSettingsFormElement();
    selectInstances = {};
    themeButtons = undefined;
    const currentManga = getCurrentManga();

    // Create Theme Buttons
    const themeButtonsPlaceholder = $("#theme-buttons-placeholder", settingsFormContainer);
    if (themeButtonsPlaceholder) {
        themeButtons = createThemeButtons({
            container: themeButtonsPlaceholder,
            items: [
                { icon: "Sun", text: "Light", value: "light" },
                { icon: "Moon", text: "Dark", value: "dark" },
                { icon: "Laptop", text: "System", value: "system" },
            ],
            onChange: applyTheme,
            value: initialSettingsOnOpen.themePreference,
        });
    }

    // Create Manga-Specific Selects (if manga loaded), driven by mangaSettingConfig
    if (currentManga) {
        for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
            const config = mangaSettingConfig[key];
            if (config.type !== "select" || !config.items) continue;

            const placeholder = $(`#${config.id}`, settingsFormContainer);
            if (!placeholder) continue;

            selectInstances[key] = createSelect({
                container: placeholder,
                items: config.items,
                onChange: (value) => livePreview(key, value as ConfiguredMangaSettings[typeof key]),
                value: initialSettingsOnOpen[key] as string,
            }) as SelectInstance;
        }
    }

    // If a manga is loaded, create and inject the MangaForm
    if (currentManga) {
        const mangaDetailsPane = $("#settings-manga-details", settingsFormContainer);
        mangaDetailsPane?.append(createMangaFormElement(currentManga));
    }

    // Populate the form and set initial UI states
    populateSettingsForm();

    // Enable/disable manga-specific tabs
    toggleMangaSettingsTabs(Boolean(currentManga));

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

function populateSettingsForm(): void {
    if (!settingsFormContainer) return;
    const container = settingsFormContainer;
    const currentSettings = loadCurrentSettings();
    themeButtons?.setValue(currentSettings.themePreference);

    withCurrentManga(() => {
        setSettingsToDOM(currentSettings, container);
        updateDependentUI(container);
    });
}

function updateDependentUI(container: HTMLElement): void {
    syncControl(container, {
        checkbox: `#${mangaSettingConfig.collapseSpacing.id}`,
        dependents: [`#${mangaSettingConfig.spacingAmount.id}`],
        invert: true,
    });
    syncControl(container, {
        checkbox: `#${mangaSettingConfig.progressBarEnabled.id}`,
        dependents: [".progress-bar-option"],
        selects: [selectInstances.progressBarPosition, selectInstances.progressBarStyle],
    });
    syncControl(container, {
        checkbox: `#${mangaSettingConfig.autoScrollEnabled.id}`,
        dependents: ["#auto-scroll-options"],
    });
}

interface SyncControlOptions {
    checkbox: string;
    dependents?: string[];
    invert?: boolean;
    selects?: ({ element: HTMLDivElement } | undefined)[];
}

function syncControl(
    container: HTMLElement,
    { checkbox, dependents = [], invert = false, selects = [] }: SyncControlOptions,
): void {
    const checkboxEl = $<HTMLInputElement>(checkbox, container);
    if (!checkboxEl) return;
    const isEnabled = invert ? !isChecked(checkboxEl) : isChecked(checkboxEl);

    dependents.forEach((selector) => {
        for (const el of $$(selector, container)) {
            const input = (el.matches("input, button") ? el : $("input, button", el)) as
                | HTMLButtonElement
                | HTMLInputElement
                | null;

            toggleClass(el, "opacity-50 cursor-not-allowed", !isEnabled);
            if (input) input.disabled = !isEnabled;
        }
    });

    selects.forEach((select) => {
        const button = select?.element ? $<HTMLButtonElement>(".select-btn", select.element) : null;
        if (button) button.disabled = !isEnabled;
    });
}

function handleModalOpen(): void {
    onAppEvent("themeChanged", handleExternalThemeChange);
}

function handleModalClose(): void {
    offAppEvent("themeChanged", handleExternalThemeChange);

    if (!settingsSaved) {
        applyTheme(initialSettingsOnOpen.themePreference);
        withCurrentManga(() => {
            applySettings(initialSettingsOnOpen);
        });
    }

    // Destroy custom components
    for (const select of Object.values(selectInstances)) select?.destroy();
    themeButtons?.destroy();
    selectInstances = {};
    themeButtons = undefined;

    settingsFormContainer = null;
    initialSettingsOnOpen = {} as ResolvedSettings;
    settingsSaved = false;
}

function addEventListeners(container: HTMLElement): void {
    $("#shortcuts-help-button", container)?.addEventListener("click", showShortcutsHelp);
    $("#reset-settings-button", container)?.addEventListener("click", handleResetSettings);

    withCurrentManga(() => {
        $(`#${mangaSettingConfig.collapseSpacing.id}`, container)?.addEventListener("change", () =>
            updateDependentUI(container),
        );
        $<HTMLInputElement>(`#${mangaSettingConfig.progressBarEnabled.id}`, container)?.addEventListener(
            "change",
            (event) => {
                updateDependentUI(container);
                livePreview("progressBarEnabled", isChecked(event.target as HTMLInputElement));
            },
        );
        $<HTMLInputElement>(`#${mangaSettingConfig.autoScrollEnabled.id}`, container)?.addEventListener(
            "change",
            (event) => {
                updateDependentUI(container);
                // Not livePreview: don't start auto-scroll while modal covers viewer
                if (!isChecked(event.target as HTMLInputElement)) stopAutoScroll();
            },
        );
        $<HTMLInputElement>(`#${mangaSettingConfig.scrubberEnabled.id}`, container)?.addEventListener(
            "change",
            (event) => {
                livePreview("scrubberEnabled", isChecked(event.target as HTMLInputElement));
            },
        );
        $<HTMLInputElement>(`#${mangaSettingConfig.navBarEnabled.id}`, container)?.addEventListener(
            "change",
            (event) => {
                livePreview("navBarEnabled", isChecked(event.target as HTMLInputElement));
            },
        );
    });
}

const handleExternalThemeChange = (
    event: CustomEvent<{ themePreference: ResolvedSettings["themePreference"] }>,
): void => {
    themeButtons?.setValue(event.detail.themePreference);
};

function handleSettingsSave(): void {
    if (!settingsFormContainer) return;
    const container = settingsFormContainer;

    // --- Save General Settings ---
    const newPreference = themeButtons?.getValue() ?? "system";
    if (newPreference === (PersistState.themePreference || "system")) {
        // Re-apply in case the OS/system theme changed.
        applyTheme(newPreference);
    } else {
        PersistState.update("themePreference", newPreference);
    }

    // --- Save Manga-Specific Settings ---
    const mangaSaveResult = withCurrentManga((currentManga) => {
        const mangaId = currentManga.id;
        const newMangaSettings = getSettingsFromDOM(container);

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $<HTMLFormElement>("#manga-form", container);
        if (mangaForm) {
            const isValid = validateAndReport(mangaForm, "settings-form-error", {
                onInvalid: () => switchSettingsTab("settings-manga-details"),
            });
            if (!isValid) return false;

            const formData = getMangaFormData(mangaForm);
            if (formData) editManga(mangaId, formData);
        } else {
            showFormError("settings-form-error");
        }

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

function handleResetSettings(): void {
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
