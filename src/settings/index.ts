import { $, $$, getValue, h, isChecked, setChecked, setValue, toggleClass } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, ResolvedSettings } from "@/types";
import { PersistState, getCurrentManga, updateSettings } from "@/state";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { type SettingDefinition, applySettings, loadCurrentSettings, mangaSettingConfig } from "./runtime";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { confirmModal, hideModal, showModal } from "@/components/modal";
import { createMangaFormElement, getMangaFormData } from "@/library/manga-form";
import { createSettingsFormElement, switchSettingsTab, toggleMangaSettingsTabs } from "./form";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import {
    reportValidationResult,
    showFormError,
    validateAndReport,
    validateRequiredInputs,
} from "@/components/form-validation";
import { applyTheme } from "@/app/theme";
import { editManga } from "@/library/manga-actions";
import { showShortcutsHelp } from "@/app/shortcuts-help";
import { stopAutoScroll } from "@/viewer/auto-scroll";
import { toInt } from "@/core/utils";

const SETTINGS_MODAL_ID = "settings-modal";
let settingsFormContainer: HTMLElement | null = null;
let initialSettingsOnOpen: ResolvedSettings = {} as ResolvedSettings;
let settingsSaved = false;

const settingSelector = (key: keyof ConfiguredMangaSettings): string => `#${key}`;

let selectInstances: Partial<Record<keyof ConfiguredMangaSettings, SelectInstance>> = {};
let themeButtons: ThemeButtonsInstance | undefined;

function livePreview<K extends keyof ConfiguredMangaSettings>(key: K, value: ConfiguredMangaSettings[K]): void {
    if (!settingsFormContainer) return;
    mangaSettingConfig[key].apply?.(value, getSettingsFromDOM(settingsFormContainer));
}

// --- Generic Setting Helpers ---

function getNumberSettingInputs(
    container: HTMLElement,
): { input: HTMLInputElement; key: keyof ConfiguredMangaSettings }[] {
    const result: { input: HTMLInputElement; key: keyof ConfiguredMangaSettings }[] = [];
    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        if (mangaSettingConfig[key].type !== "input") continue;
        const input = $<HTMLInputElement>(settingSelector(key), container);
        if (input) result.push({ input, key });
    }
    return result;
}

function getSettingsFromDOM(container: HTMLElement): ConfiguredMangaSettings {
    const settings = {} as Partial<Record<keyof ConfiguredMangaSettings, unknown>>;

    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key];

        if (config.type === "select") {
            settings[key] = selectInstances[key]?.getValue() ?? config.defaultValue;
        } else if (config.type === "checkbox") {
            const element = $<HTMLInputElement>(settingSelector(key), container);
            if (element) settings[key] = isChecked(element);
        }
    }

    for (const { key, input } of getNumberSettingInputs(container)) {
        settings[key] = toInt(getValue(input), (mangaSettingConfig[key] as SettingDefinition<number>).defaultValue);
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
            const element = $<HTMLInputElement>(settingSelector(key), container);
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

            const placeholder = $(settingSelector(key), settingsFormContainer);
            if (!placeholder) continue;

            selectInstances[key] = createSelect({
                container: placeholder,
                items: config.items,
                onChange: (value) => livePreview(key, value as ConfiguredMangaSettings[typeof key]),
                value: initialSettingsOnOpen[key] as string,
                width: config.selectWidth,
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
            { id: "save-settings-btn", onClick: handleSettingsSave, text: "Save settings", type: "primary" },
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

    if (getCurrentManga()) {
        setSettingsToDOM(currentSettings, container);
        updateDependentUI(container);
    }
}

function updateDependentUI(container: HTMLElement): void {
    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key];
        if (!config.dependents) continue;

        syncControl(container, {
            checkbox: settingSelector(key),
            dependents: config.dependents,
            invert: config.invertDependents,
        });
    }
}

interface SyncControlOptions {
    checkbox: string;
    dependents: readonly string[];
    invert?: boolean;
}

function syncControl(container: HTMLElement, { checkbox, dependents, invert = false }: SyncControlOptions): void {
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
}

function handleModalOpen(): void {
    onAppEvent("themeChanged", handleExternalThemeChange);
}

function handleModalClose(): void {
    offAppEvent("themeChanged", handleExternalThemeChange);

    if (!settingsSaved) {
        applyTheme(initialSettingsOnOpen.themePreference);
        if (getCurrentManga()) {
            applySettings(initialSettingsOnOpen);
        }
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

    if (!getCurrentManga()) return;

    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        if (!mangaSettingConfig[key].dependents) continue;
        $(settingSelector(key), container)?.addEventListener("change", () => updateDependentUI(container));
    }

    $<HTMLInputElement>(settingSelector("progressBarEnabled"), container)?.addEventListener("change", (event) => {
        livePreview("progressBarEnabled", isChecked(event.target as HTMLInputElement));
    });
    $<HTMLInputElement>(settingSelector("autoScrollEnabled"), container)?.addEventListener("change", (event) => {
        // Not livePreview: don't start auto-scroll while modal covers viewer
        if (!isChecked(event.target as HTMLInputElement)) stopAutoScroll();
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
    if (newPreference === PersistState.themePreference) {
        // Re-apply in case the OS/system theme changed.
        applyTheme(newPreference);
    } else {
        PersistState.update("themePreference", newPreference);
    }

    // --- Save Manga-Specific Settings ---
    const currentManga = getCurrentManga();
    if (currentManga) {
        const mangaId = currentManga.id;

        const invalidNumberInput = validateRequiredInputs(getNumberSettingInputs(container).map(({ input }) => input));
        if (
            !reportValidationResult(invalidNumberInput, "settings-form-error", () => {
                const tabPane = invalidNumberInput?.closest<HTMLElement>('[data-tab-panel="true"]');
                if (tabPane?.id) switchSettingsTab(tabPane.id);
            })
        ) {
            return;
        }

        const newMangaSettings = getSettingsFromDOM(container);

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $<HTMLFormElement>("#manga-form", container);
        if (mangaForm) {
            const isValid = validateAndReport(mangaForm, "settings-form-error", {
                onInvalid: () => switchSettingsTab("settings-manga-details"),
            });
            if (!isValid) return;

            const formData = getMangaFormData(mangaForm);
            if (formData) editManga(mangaId, formData);
        } else {
            showFormError("settings-form-error");
        }

        updateSettings(mangaId, newMangaSettings);
        applySettings(newMangaSettings);
    }

    settingsSaved = true;
    hideModal(SETTINGS_MODAL_ID);
}

const RESET_SETTINGS_MODAL_ID = "reset-settings-confirm-modal";

function handleResetSettings(): void {
    confirmModal(RESET_SETTINGS_MODAL_ID, {
        confirmText: "Reset",
        content: h(
            "p",
            {},
            "Are you sure you want to reset all settings to their defaults? This action cannot be undone.",
        ),
        onConfirm: performSettingsReset,
        title: "Reset all settings?",
    });
}

function performSettingsReset(): void {
    // Reset general settings
    PersistState.update("themePreference", "system");
    applyTheme("system");

    // Reset manga-specific settings
    const currentManga = getCurrentManga();
    if (currentManga) {
        const mangaId = currentManga.id;
        if (PersistState.mangaSettings[mangaId]) {
            const remainingSettings = { ...PersistState.mangaSettings };
            delete remainingSettings[mangaId];
            PersistState.update("mangaSettings", remainingSettings);
        }
        // Apply default settings to the UI
        const defaultSettings = loadCurrentSettings();
        applySettings(defaultSettings);
    }

    populateSettingsForm();
    hideModal(RESET_SETTINGS_MODAL_ID);
}
