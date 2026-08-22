import { $, $$, h, toggleClass } from "@/core/dom-utils";
import type { ConfiguredMangaSettings, ResolvedMangaSettings, ThemePreference } from "@/types";
import {
    CurrentSettings,
    DEFAULT_MANGA_SETTINGS,
    PersistState,
    applySnapshot,
    beginSettingsDraft,
    endSettingsDraft,
    getCurrentManga,
} from "@/state";
import { type SelectInstance, createSelect } from "@/components/custom-select";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { confirmModal, hideModal, showModal } from "@/components/modal";
import { createMangaFormElement, getMangaFormData } from "@/library/manga-form";
import { createSettingsFormElement, mangaSettingConfig, switchSettingsTab, toggleMangaSettingsTabs } from "./form";
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
    initial: ResolvedMangaSettings;
    initialTheme: ThemePreference;
    saved: boolean;
    selects: Partial<Record<keyof ConfiguredMangaSettings, SelectInstance>>;
    themeButtons: ThemeButtonsInstance;
}

let session: SettingsSession | null = null;
let themeController = new AbortController();

const settingSelector = (key: keyof ConfiguredMangaSettings): string => `#${key}`;
const settingKeys = Object.keys(mangaSettingConfig) as (keyof ConfiguredMangaSettings)[];

// Live previews write straight into CurrentSettings: widgets re-apply
// themselves, and persistence waits for the draft to end.
function livePreview<K extends keyof ConfiguredMangaSettings>(key: K, value: ConfiguredMangaSettings[K]): void {
    CurrentSettings.update(key, value as ResolvedMangaSettings[K]);
}

// --- Generic Setting Helpers ---

function getNumberSettingInputs(
    container: HTMLElement,
): { input: HTMLInputElement; key: keyof ConfiguredMangaSettings }[] {
    const result: { input: HTMLInputElement; key: keyof ConfiguredMangaSettings }[] = [];
    for (const key of settingKeys) {
        if (mangaSettingConfig[key].type !== "input") continue;
        const input = $<HTMLInputElement>(settingSelector(key), container);
        if (input) result.push({ input, key });
    }
    return result;
}

function getSettingsFromDOM({ container, selects }: SettingsSession): ConfiguredMangaSettings {
    const settings = {} as Partial<Record<keyof ConfiguredMangaSettings, unknown>>;

    for (const key of settingKeys) {
        const config = mangaSettingConfig[key];

        if (config.type === "select") {
            settings[key] = selects[key]?.getValue() ?? DEFAULT_MANGA_SETTINGS[key];
        } else if (config.type === "checkbox") {
            const element = $<HTMLInputElement>(settingSelector(key), container);
            if (element) settings[key] = element.checked;
        }
    }

    for (const { key, input } of getNumberSettingInputs(container)) {
        settings[key] = toInt(input.value, DEFAULT_MANGA_SETTINGS[key] as number);
    }

    return settings as ConfiguredMangaSettings;
}

function setSettingsToDOM(settings: ConfiguredMangaSettings, { container, selects }: SettingsSession): void {
    for (const key of settingKeys) {
        const config = mangaSettingConfig[key];
        const value = settings[key];

        if (config.type === "select") {
            selects[key]?.setValue(String(value));
        } else {
            const element = $<HTMLInputElement>(settingSelector(key), container);
            if (element) {
                if (config.type === "input") {
                    element.value = String(value as number);
                } else if (config.type === "checkbox") {
                    element.checked = value as boolean;
                }
            }
        }
    }
}

// --- UI Interaction ---

export function openSettings(): void {
    if (session) return;

    beginSettingsDraft();
    const currentManga = getCurrentManga();
    const initial: ResolvedMangaSettings = { ...CurrentSettings };
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

    const selects: SettingsSession["selects"] = {};

    if (currentManga) {
        for (const key of settingKeys) {
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

    session = { container, initial, initialTheme: PersistState.themePreference, saved: false, selects, themeButtons };

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

    session.themeButtons.setValue(PersistState.themePreference);

    if (getCurrentManga()) {
        setSettingsToDOM(CurrentSettings, session);
        updateDependentUI(session.container);
    }
}

function updateDependentUI(container: HTMLElement): void {
    for (const key of settingKeys) {
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
    endSettingsDraft();
    themeController.abort();

    if (!session) return;

    if (!session.saved) {
        applyTheme(session.initialTheme);
        applySnapshot(session.initial);
    }

    for (const select of Object.values(session.selects)) select?.destroy();
    session.themeButtons.destroy();
    session = null;
}

function addEventListeners(container: HTMLElement): void {
    $("#shortcuts-help-button", container)?.addEventListener("click", showShortcutsHelp);
    $("#reset-settings-button", container)?.addEventListener("click", handleResetSettings);

    if (!getCurrentManga()) return;

    for (const key of settingKeys) {
        if (!mangaSettingConfig[key].dependents) continue;
        $(settingSelector(key), container)?.addEventListener("change", () => updateDependentUI(container));
    }

    $<HTMLInputElement>(settingSelector("progressBarEnabled"), container)?.addEventListener("change", (event) => {
        livePreview("progressBarEnabled", (event.target as HTMLInputElement).checked);
    });
    $<HTMLInputElement>(settingSelector("autoScrollEnabled"), container)?.addEventListener("change", (event) => {
        // Not livePreview: don't start auto scroll while modal covers viewer
        if (!(event.target as HTMLInputElement).checked) stopAutoScroll();
    });
}

const handleExternalThemeChange = (event: CustomEvent<{ themePreference: ThemePreference }>): void => {
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
            if (formData) editManga(currentManga.id, formData);
        }

        for (const key of settingKeys) {
            CurrentSettings.update(key, newMangaSettings[key]);
        }
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

    // Reset manga-specific settings; reading progress is intentionally kept.
    if (getCurrentManga()) {
        for (const key of settingKeys) {
            CurrentSettings.update(key, DEFAULT_MANGA_SETTINGS[key]);
        }
    }

    populateSettingsForm();
    hideModal(RESET_SETTINGS_MODAL_ID);
}
