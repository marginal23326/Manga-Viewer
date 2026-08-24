import { $, $$, h, toggleClass } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, ResolvedSettings } from "@/types";
import { PersistState, getCurrentManga, updateSettings } from "@/state";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { type SettingDefinition, applySettings, loadCurrentSettings, mangaSettingConfig } from "./runtime";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { confirmModal, hideModal, showModal } from "@/components/modal";
import { createMangaFormElement, getMangaFormData } from "@/library/manga-form";
import { createSettingsFormElement, switchSettingsTab, toggleMangaSettingsTabs } from "./form";
import { renewController, toInt } from "@/core/utils";
import { reportValidationResult, validateAndReport, validateRequiredInputs } from "@/components/form-validation";
import { applyTheme } from "@/app/theme";
import { editManga } from "@/library/manga-actions";
import { onAppEvent } from "@/core/app-events";
import { showShortcutsHelp } from "@/app/shortcuts-help";
import { stopAutoScroll } from "@/viewer/auto-scroll";

const SETTINGS_MODAL_ID = "settings-modal";

interface SettingsSession {
    container: HTMLElement;
    initial: ResolvedSettings;
    saved: boolean;
    selects: Partial<Record<keyof ConfiguredMangaSettings, SelectInstance>>;
    themeButtons: ThemeButtonsInstance;
}

let session: SettingsSession | null = null;
let themeController = new AbortController();

const settingSelector = (key: keyof ConfiguredMangaSettings): string => `#${key}`;

function livePreview<K extends keyof ConfiguredMangaSettings>(key: K, value: ConfiguredMangaSettings[K]): void {
    if (!session) return;
    mangaSettingConfig[key].apply?.(value, getSettingsFromDOM(session));
}

// --- Generic Setting Helpers ---

function getSettingElements(container: HTMLElement): Map<string, HTMLInputElement> {
    return new Map($$<HTMLInputElement>("input[name]", container).map((el) => [el.name, el]));
}

function getNumberSettingInputs(
    container: HTMLElement,
): { input: HTMLInputElement; key: keyof ConfiguredMangaSettings }[] {
    const elements = getSettingElements(container);
    const result: { input: HTMLInputElement; key: keyof ConfiguredMangaSettings }[] = [];
    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        if (mangaSettingConfig[key].type !== "input") continue;
        const input = elements.get(key);
        if (input) result.push({ input, key });
    }
    return result;
}

function getSettingsFromDOM({ container, selects }: SettingsSession): ConfiguredMangaSettings {
    const elements = getSettingElements(container);
    const settings = {} as Partial<Record<keyof ConfiguredMangaSettings, unknown>>;

    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key];

        if (config.type === "select") {
            settings[key] = selects[key]?.getValue() ?? config.defaultValue;
            continue;
        }

        const element = elements.get(key);
        if (config.type === "checkbox" && element) settings[key] = element.checked;
    }

    for (const { key, input } of getNumberSettingInputs(container)) {
        settings[key] = toInt(input.value, (mangaSettingConfig[key] as SettingDefinition<number>).defaultValue);
    }

    return settings as ConfiguredMangaSettings;
}

function setSettingsToDOM(settings: ConfiguredMangaSettings, { container, selects }: SettingsSession): void {
    const elements = getSettingElements(container);

    for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
        const config = mangaSettingConfig[key];
        const value = settings[key];

        if (config.type === "select") {
            selects[key]?.setValue(String(value));
            continue;
        }

        const element = elements.get(key);
        if (!element) continue;
        if (config.type === "input") element.value = String(value as number);
        else if (config.type === "checkbox") element.checked = value as boolean;
    }
}

// --- UI Interaction ---

export function openSettings(): void {
    const currentManga = getCurrentManga();
    const initial = loadCurrentSettings();
    const { element: container, themePlaceholder } = createSettingsFormElement();

    const themeButtons = createThemeButtons({
        container: themePlaceholder,
        items: [
            { icon: "Sun", text: "Light", value: "light" },
            { icon: "Moon", text: "Dark", value: "dark" },
            { icon: "Laptop", text: "System", value: "system" },
        ],
        onChange: applyTheme,
        value: initial.themePreference,
    });

    const selects: SettingsSession["selects"] = {};

    if (currentManga) {
        for (const key of Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[]) {
            const config = mangaSettingConfig[key];
            if (config.type !== "select" || !config.items) continue;

            const placeholder = $(settingSelector(key), container);
            if (!placeholder) continue;

            selects[key] = createSelect({
                container: placeholder,
                items: config.items,
                onChange: (value) => livePreview(key, value as ConfiguredMangaSettings[typeof key]),
                value: initial[key] as string,
                width: config.selectWidth,
            }) as SelectInstance;
        }

        $("#settings-manga-details", container)?.append(createMangaFormElement(currentManga));
    }

    session = { container, initial, saved: false, selects, themeButtons };

    // Populate the form and set initial UI states
    populateSettingsForm();

    // Enable/disable manga-specific tabs
    toggleMangaSettingsTabs(Boolean(currentManga));

    showModal(SETTINGS_MODAL_ID, {
        buttons: [
            { onClick: () => hideModal(SETTINGS_MODAL_ID), text: "Cancel", type: "secondary" },
            { id: "save-settings-btn", onClick: handleSettingsSave, text: "Save settings", type: "primary" },
        ],
        content: container,
        errorElementId: "settings-form-error",
        onClose: handleModalClose,
        onOpen: handleModalOpen,
        size: "xl",
        title: "Settings",
    });

    addEventListeners(container);
}

function populateSettingsForm(): void {
    if (!session) return;
    const currentSettings = loadCurrentSettings();

    session.themeButtons.setValue(currentSettings.themePreference);

    if (getCurrentManga()) {
        setSettingsToDOM(currentSettings, session);
        updateDependentUI(session.container);
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
    const isEnabled = invert ? !checkboxEl.checked : checkboxEl.checked;

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
    themeController = renewController(themeController);
    onAppEvent("themeChanged", handleExternalThemeChange, { signal: themeController.signal });
}

function handleModalClose(): void {
    themeController.abort();

    if (!session) return;

    if (!session.saved) {
        applyTheme(session.initial.themePreference);
        if (getCurrentManga()) {
            applySettings(session.initial);
        }
    }

    for (const select of Object.values(session.selects)) select?.destroy();
    session.themeButtons.destroy();
    session = null;
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
        livePreview("progressBarEnabled", (event.target as HTMLInputElement).checked);
    });
    $<HTMLInputElement>(settingSelector("autoScrollEnabled"), container)?.addEventListener("change", (event) => {
        // Not livePreview: don't start auto-scroll while modal covers viewer
        if (!(event.target as HTMLInputElement).checked) stopAutoScroll();
    });
}

const handleExternalThemeChange = (
    event: CustomEvent<{ themePreference: ResolvedSettings["themePreference"] }>,
): void => {
    session?.themeButtons.setValue(event.detail.themePreference);
};

function handleSettingsSave(): void {
    if (!session) return;
    const { container, themeButtons } = session;

    // --- Save General Settings ---
    const newPreference = themeButtons.getValue();
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

        const newMangaSettings = getSettingsFromDOM(session);

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $<HTMLFormElement>("#manga-form", container);
        if (mangaForm) {
            const isValid = validateAndReport(mangaForm, "settings-form-error", {
                onInvalid: () => switchSettingsTab("settings-manga-details"),
            });
            if (!isValid) return;

            const formData = getMangaFormData(mangaForm);
            if (formData) editManga(mangaId, formData);
        }

        updateSettings(mangaId, newMangaSettings);
        applySettings(newMangaSettings);
    }

    session.saved = true;
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
