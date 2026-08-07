import { $, $$, getValue, isChecked, setChecked, setValue, toggleClass } from "@/core/dom-utils";
import type {
    ConfiguredMangaSettings,
    ImageFit,
    ProgressBarPosition,
    ProgressBarStyle,
    ResolvedSettings,
} from "@/types";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import {
    type SettingDefinition,
    applySettings,
    loadCurrentSettings,
    mangaSettingConfig,
} from "./viewer-settings-runtime";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { createMangaFormElement, getMangaFormData, showFormError, validateAndReport } from "./manga-form";
import { createSettingsFormElement, switchSettingsTab, toggleMangaSettingsTabs } from "./settings-form";
import { getCurrentManga, withCurrentManga } from "@/state/manga-library";
import { hideModal, showModal } from "@/components/modal";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import { recordValues, toInt } from "@/core/utils";
import { PersistState } from "@/state/state";
import { applyCurrentZoom } from "./zoom-manager";
import { applyProgressBarSettings } from "./progress-bar";
import { applyTheme } from "./theme-manager";
import { editManga } from "./manga-manager";
import { setNavBarEnabled } from "./navigation-manager";
import { setScrubberEnabled } from "./scrubber-manager";
import { showShortcutsHelp } from "@/ui/shortcuts-help";
import { stopAutoScroll } from "./auto-scroll";
import { updateSettings } from "@/state/manga-settings";

const SETTINGS_MODAL_ID = "settings-modal";
let settingsFormContainer: HTMLElement | null = null;
let initialSettingsOnOpen: ResolvedSettings = {} as ResolvedSettings;
let settingsSaved = false;

interface ComponentInstances {
    imageFitSelect?: SelectInstance<ImageFit>;
    progressBarPositionSelect?: SelectInstance<ProgressBarPosition>;
    progressBarStyleSelect?: SelectInstance<ProgressBarStyle>;
    themeButtons?: ThemeButtonsInstance;
}

let componentInstances: ComponentInstances = {};

// --- Generic Setting Helpers ---

function getSelectInstance(key: keyof ConfiguredMangaSettings): SelectInstance | undefined {
    switch (key) {
        case "imageFit": {
            return componentInstances.imageFitSelect as SelectInstance | undefined;
        }
        case "progressBarPosition": {
            return componentInstances.progressBarPositionSelect as SelectInstance | undefined;
        }
        case "progressBarStyle": {
            return componentInstances.progressBarStyleSelect as SelectInstance | undefined;
        }
        default: {
            return undefined;
        }
    }
}

function getSettingsFromDOM(container: HTMLElement): ConfiguredMangaSettings {
    const settings = {} as Partial<Record<keyof ConfiguredMangaSettings, unknown>>;

    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key] as SettingDefinition<unknown>;

        if (config.type === "select") {
            settings[key] = getSelectInstance(key)?.getValue() ?? config.defaultValue;
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
            getSelectInstance(key)?.setValue(String(value));
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
    componentInstances = {};
    const currentManga = getCurrentManga();

    // Create Theme Buttons
    const themeButtonsPlaceholder = $("#theme-buttons-placeholder", settingsFormContainer);
    if (themeButtonsPlaceholder) {
        componentInstances.themeButtons = createThemeButtons({
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

    // Create Manga-Specific Selects (if manga loaded)
    if (currentManga) {
        const imageFitPlaceholder = $("#image-fit-select-placeholder", settingsFormContainer);
        if (imageFitPlaceholder) {
            componentInstances.imageFitSelect = createSelect<ImageFit>({
                container: imageFitPlaceholder,
                items: [
                    { text: "Original Size", value: "original" },
                    { text: "Fit Width", value: "width" },
                    { text: "Fit Height", value: "height" },
                ],
                onChange: (value) => applyCurrentZoom(value),
                value: initialSettingsOnOpen.imageFit,
            });
        }

        const positionPlaceholder = $("#progress-bar-position-select-placeholder", settingsFormContainer);
        if (positionPlaceholder) {
            componentInstances.progressBarPositionSelect = createSelect<ProgressBarPosition>({
                container: positionPlaceholder,
                items: [
                    { text: "Top", value: "top" },
                    { text: "Bottom", value: "bottom" },
                ],
                onChange: (value) => applyProgressBarSettings({ progressBarPosition: value }),
                value: initialSettingsOnOpen.progressBarPosition,
            });
        }

        const stylePlaceholder = $("#progress-bar-style-select-placeholder", settingsFormContainer);
        if (stylePlaceholder) {
            componentInstances.progressBarStyleSelect = createSelect<ProgressBarStyle>({
                container: stylePlaceholder,
                items: [
                    { text: "Continuous", value: "continuous" },
                    { text: "Discrete", value: "discrete" },
                ],
                onChange: (value) => applyProgressBarSettings({ progressBarStyle: value }),
                value: initialSettingsOnOpen.progressBarStyle,
            });
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

function populateSettingsForm(): void {
    if (!settingsFormContainer) return;
    const container = settingsFormContainer;
    const currentSettings = loadCurrentSettings();
    componentInstances.themeButtons?.setValue(currentSettings.themePreference);

    withCurrentManga(() => {
        setSettingsToDOM(currentSettings, container);
        updateDependentUI(container);
    });
}

function updateDependentUI(container: HTMLElement): void {
    syncControl(container, {
        checkbox: "#collapse-spacing-checkbox",
        dependents: ["#spacing-amount-input"],
        invert: true,
    });
    syncControl(container, {
        checkbox: "#enable-progress-bar-checkbox",
        dependents: [".progress-bar-option"],
        selects: [componentInstances.progressBarPositionSelect, componentInstances.progressBarStyleSelect],
    });
    syncControl(container, {
        checkbox: "#enable-auto-scroll-checkbox",
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
    recordValues(componentInstances).forEach((instance) => instance?.destroy());
    componentInstances = {};

    settingsFormContainer = null;
    initialSettingsOnOpen = {} as ResolvedSettings;
    settingsSaved = false;
}

function addEventListeners(container: HTMLElement): void {
    $("#shortcuts-help-button", container)?.addEventListener("click", showShortcutsHelp);
    $("#reset-settings-button", container)?.addEventListener("click", handleResetSettings);

    withCurrentManga(() => {
        $("#collapse-spacing-checkbox", container)?.addEventListener("change", () => updateDependentUI(container));
        $<HTMLInputElement>("#enable-progress-bar-checkbox", container)?.addEventListener("change", (event) => {
            updateDependentUI(container);
            applyProgressBarSettings({ progressBarEnabled: (event.target as HTMLInputElement).checked });
        });
        $<HTMLInputElement>("#enable-auto-scroll-checkbox", container)?.addEventListener("change", (event) => {
            updateDependentUI(container);
            if (!(event.target as HTMLInputElement).checked) stopAutoScroll();
        });
        $<HTMLInputElement>("#enable-scrubber-checkbox", container)?.addEventListener("change", (event) => {
            setScrubberEnabled((event.target as HTMLInputElement).checked);
        });
        $<HTMLInputElement>("#enable-nav-bar-checkbox", container)?.addEventListener("change", (event) => {
            setNavBarEnabled((event.target as HTMLInputElement).checked);
        });
    });
}

const handleExternalThemeChange = (
    event: CustomEvent<{ themePreference: ResolvedSettings["themePreference"] }>,
): void => {
    componentInstances.themeButtons?.setValue(event.detail.themePreference);
};

function handleSettingsSave(): void {
    if (!settingsFormContainer) return;
    const container = settingsFormContainer;

    // --- Save General Settings ---
    const newPreference = componentInstances.themeButtons?.getValue() ?? "system";
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
