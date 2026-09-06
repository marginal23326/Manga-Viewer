import { CurrentSettings, DEFAULT_MANGA_SETTINGS, PersistState, SettingsStore, getCurrentManga } from "@/state";
import type { MangaFormData, ThemePreference } from "@/types";
import { type SettingsForm, createSettingsFormElement } from "./form";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { applyTheme, commitTheme, onThemeApplied } from "@/app/theme";
import { confirmModal, hideModal, showModal } from "@/components/modal";
import { createMangaFormElement, getValidatedMangaFormData } from "@/library/manga-form";
import { createAbortScope } from "@/core/utils";
import { editManga } from "@/library/manga-actions";
import { h } from "@/core/dom-utils";
import { showShortcutsHelp } from "@/app/shortcuts-help";

const SETTINGS_MODAL_ID = "settings-modal";

interface SettingsSession {
    form: SettingsForm;
    mangaForm: HTMLFormElement | null;
    themeButtons: ThemeButtonsInstance;
}

let session: SettingsSession | null = null;
const themeScope = createAbortScope();

function revealTabFor(element: HTMLElement): void {
    const tabPane = element.closest<HTMLElement>('[data-tab-panel="true"]');
    if (tabPane && session) session.form.tabs.switchTo(tabPane);
}

// --- UI Interaction ---

export function openSettings(): void {
    if (session) return;

    const currentManga = getCurrentManga();
    const form = createSettingsFormElement(showShortcutsHelp, handleResetSettings);

    const themeButtons = createThemeButtons({
        container: form.themePlaceholder,
        items: [
            { icon: "Sun", text: "Light", value: "light" },
            { icon: "Moon", text: "Dark", value: "dark" },
            { icon: "Laptop", text: "System", value: "system" },
        ],
        onChange: applyTheme,
        value: PersistState.themePreference,
    });

    let mangaForm: HTMLFormElement | null = null;
    if (currentManga) {
        mangaForm = createMangaFormElement(currentManga);
        form.detailsPane.append(mangaForm);
    }

    session = { form, mangaForm, themeButtons };
    form.setMangaTabsEnabled(Boolean(currentManga));

    showModal(SETTINGS_MODAL_ID, {
        buttons: [
            { onClick: () => hideModal(SETTINGS_MODAL_ID), side: "left", text: "Cancel", type: "secondary" },
            { id: "save-settings-btn", onClick: handleSettingsSave, text: "Save settings", type: "primary" },
        ],
        content: form.element,
        onClose: handleModalClose,
        onOpen: handleModalOpen,
        size: "xl",
        title: "Settings",
    });
}

function handleModalOpen(): void {
    const signal = themeScope.renew();
    onThemeApplied(handleExternalThemeChange, { signal });
}

function handleModalClose(): void {
    themeScope.abort();

    if (!session) return;

    applyTheme(PersistState.themePreference);
    SettingsStore.discardDraft();

    session.form.destroy();
    session.themeButtons.destroy();
    session = null;
}

const handleExternalThemeChange = (themePreference: ThemePreference): void => {
    session?.themeButtons.setValue(themePreference);
};

function handleSettingsSave(): void {
    if (!session) return;
    const { form, mangaForm, themeButtons } = session;

    const currentManga = getCurrentManga();
    let validatedFormData: MangaFormData | null = null;
    if (currentManga) {
        const invalidInput = form.numberInputs.find((input) => !input.checkValidity());
        if (invalidInput) {
            revealTabFor(invalidInput);
            invalidInput.reportValidity();
            return;
        }

        if (mangaForm) {
            validatedFormData = getValidatedMangaFormData(mangaForm, revealTabFor);
            if (!validatedFormData) return;
        }
    }

    commitTheme(themeButtons.getValue());

    if (currentManga && validatedFormData) editManga(currentManga.id, validatedFormData);

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
    applyTheme("system");
    if (getCurrentManga()) CurrentSettings.hydrate(DEFAULT_MANGA_SETTINGS);
    hideModal(RESET_SETTINGS_MODAL_ID);
}
