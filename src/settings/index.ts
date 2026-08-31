import { $, $$, h } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, SettingKey, ThemePreference } from "@/types";
import { CurrentSettings, DEFAULT_MANGA_SETTINGS, PersistState, SettingsStore, getCurrentManga } from "@/state";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { confirmModal, hideModal, showModal } from "@/components/modal";
import { createMangaFormElement, getMangaFormData } from "@/library/manga-form";
import {
    createSettingsFormElement,
    mangaSettingConfig,
    settingSelector,
    switchSettingsTab,
    syncDependentUI,
    toggleMangaSettingsTabs,
    updateDependentUI,
} from "./form";
import { renewController, toInt } from "@/core/utils";
import { reportValidationResult, validateAndReport, validateRequiredInputs } from "@/components/form-validation";
import { applyTheme } from "@/app/theme";
import { editManga } from "@/library/manga-actions";
import { onAppEvent } from "@/core/app-events";
import { showShortcutsHelp } from "@/app/shortcuts-help";

const SETTINGS_MODAL_ID = "settings-modal";

type SettingControl =
    | { readonly input: HTMLInputElement; readonly key: SettingKey; readonly kind: "checkbox" | "input" }
    | { readonly key: SettingKey; readonly kind: "select"; readonly select: SelectInstance };

interface SettingsSession {
    container: HTMLElement;
    controls: SettingControl[];
    themeButtons: ThemeButtonsInstance;
}

let session: SettingsSession | null = null;
let themeController = new AbortController();

const settingKeys = Object.keys(mangaSettingConfig) as SettingKey[];

const readNumberSetting = (key: SettingKey, input: HTMLInputElement): number =>
    toInt(input.value, DEFAULT_MANGA_SETTINGS[key] as number);

function writeSettingValue(control: SettingControl, value: ConfiguredMangaSettings[SettingKey]): void {
    if (control.kind === "select") control.select.setValue(String(value));
    else if (control.kind === "checkbox") control.input.checked = value as boolean;
    else control.input.value = String(value);
}

function previewSetting<K extends SettingKey>(key: K, value: ConfiguredMangaSettings[K]): void {
    CurrentSettings.hydrate({ [key]: value });
}

// --- Generic Setting Helpers ---

function getSettingElements(container: HTMLElement): Map<string, HTMLInputElement> {
    return new Map($$<HTMLInputElement>("input[name]", container).map((el) => [el.name, el]));
}

function buildSettingControls(container: HTMLElement): SettingControl[] {
    const elements = getSettingElements(container);
    const controls: SettingControl[] = [];

    for (const key of settingKeys) {
        const config = mangaSettingConfig[key];

        if (config.type === "select") {
            const placeholder = $(settingSelector(key), container);
            if (!placeholder || !config.items) continue;

            controls.push({
                key,
                kind: "select",
                select: createSelect({
                    container: placeholder,
                    items: config.items,
                    onChange: (value) => previewSetting(key, value as ConfiguredMangaSettings[typeof key]),
                    value: String(CurrentSettings[key]),
                    width: config.selectWidth,
                }),
            });
            continue;
        }

        const input = elements.get(key);
        if (!input) continue;

        const control: SettingControl = { input, key, kind: config.type };
        writeSettingValue(control, CurrentSettings[key]);

        input.addEventListener(config.type === "checkbox" ? "change" : "input", () => {
            syncDependentUI(container, key);

            const next = config.type === "checkbox" ? input.checked : readNumberSetting(key, input);
            previewSetting(key, next as ConfiguredMangaSettings[typeof key]);
        });

        controls.push(control);
    }

    return controls;
}

// --- UI Interaction ---

export function openSettings(): void {
    if (session) return;

    const currentManga = getCurrentManga();
    const { element: container, themePlaceholder } = createSettingsFormElement();

    const themeButtons = createThemeButtons({
        container: themePlaceholder,
        items: [
            { icon: "Sun", text: "Light", value: "light" },
            { icon: "Moon", text: "Dark", value: "dark" },
            { icon: "Laptop", text: "System", value: "system" },
        ],
        onChange: applyTheme,
        value: PersistState.themePreference,
    });

    let controls: SettingControl[] = [];

    if (currentManga) {
        controls = buildSettingControls(container);
        $("#settings-manga-details", container)?.append(createMangaFormElement(currentManga));
    }

    session = { container, controls, themeButtons };

    if (currentManga) updateDependentUI(container);

    // Enable/disable manga-specific tabs
    toggleMangaSettingsTabs(Boolean(currentManga));

    showModal(SETTINGS_MODAL_ID, {
        buttons: [
            { onClick: () => hideModal(SETTINGS_MODAL_ID), side: "left", text: "Cancel", type: "secondary" },
            { id: "save-settings-btn", onClick: handleSettingsSave, text: "Save settings", type: "primary" },
        ],
        content: container,
        errorElementId: "settings-form-error",
        onClose: handleModalClose,
        onOpen: handleModalOpen,
        size: "xl",
        title: "Settings",
    });

    $("#shortcuts-help-button", container)?.addEventListener("click", showShortcutsHelp);
    $("#reset-settings-button", container)?.addEventListener("click", handleResetSettings);
}

function handleModalOpen(): void {
    themeController = renewController(themeController);
    onAppEvent("themeChanged", handleExternalThemeChange, { signal: themeController.signal });
}

function handleModalClose(): void {
    themeController.abort();

    if (!session) return;

    applyTheme(PersistState.themePreference);
    SettingsStore.discardDraft();

    for (const c of session.controls) if (c.kind === "select") c.select.destroy();
    session.themeButtons.destroy();
    session = null;
}

const handleExternalThemeChange = (event: CustomEvent<{ themePreference: ThemePreference }>): void => {
    session?.themeButtons.setValue(event.detail.themePreference);
};

function handleSettingsSave(): void {
    if (!session) return;
    const { container, controls, themeButtons } = session;

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
        const numberInputs = controls.flatMap((c) => (c.kind === "input" ? [c.input] : []));
        const invalidNumberInput = validateRequiredInputs(numberInputs);
        if (
            !reportValidationResult(invalidNumberInput, "settings-form-error", () => {
                const tabPane = invalidNumberInput?.closest<HTMLElement>('[data-tab-panel="true"]');
                if (tabPane?.id) switchSettingsTab(tabPane.id);
            })
        ) {
            return;
        }

        // --- Save Manga Details (if form exists) ---
        const mangaForm = $<HTMLFormElement>("#manga-form", container);
        if (mangaForm) {
            const isValid = validateAndReport(mangaForm, "settings-form-error", {
                onInvalid: () => switchSettingsTab("settings-manga-details"),
            });
            if (!isValid) return;

            const formData = getMangaFormData(mangaForm);
            if (formData) editManga(currentManga.id, formData);
        }
    }

    SettingsStore.flush();
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
    if (!session) return;

    applyTheme("system");

    if (getCurrentManga()) {
        for (const control of session.controls) {
            previewSetting(control.key, DEFAULT_MANGA_SETTINGS[control.key]);
            writeSettingValue(control, DEFAULT_MANGA_SETTINGS[control.key]);
        }

        updateDependentUI(session.container);
    }

    hideModal(RESET_SETTINGS_MODAL_ID);
}
