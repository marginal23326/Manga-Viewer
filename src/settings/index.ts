import { CurrentSettings, DEFAULT_MANGA_SETTINGS, PersistState, SettingsStore, getCurrentManga } from "@/state";
import { type SettingsForm, createSettingsFormElement } from "./form";
import { type ThemeButtonsInstance, createThemeButtons } from "@/components/theme-buttons";
import { applyTheme, commitTheme, onThemeApplied } from "@/app/theme";
import { createMangaFormElement, getValidatedMangaFormData } from "@/library/manga-form";
import { hideModal, showModal } from "@/components/modal";
import type { ThemePreference } from "@/types";
import { createAbortScope } from "@/core/utils";
import { editManga } from "@/library/manga-actions";
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
    const form = createSettingsFormElement(showShortcutsHelp, performSettingsReset);

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

    const invalidField = form.element.querySelector<HTMLInputElement>(":invalid");
    if (invalidField) {
        revealTabFor(invalidField);
        invalidField.reportValidity();
        return;
    }

    const currentManga = getCurrentManga();
    const validatedFormData = currentManga && mangaForm ? getValidatedMangaFormData(mangaForm) : null;

    commitTheme(themeButtons.getValue());

    if (currentManga && validatedFormData) editManga(currentManga.id, validatedFormData);

    SettingsStore.flush();
    hideModal(SETTINGS_MODAL_ID);
}

function performSettingsReset(): void {
    applyTheme("system");
    if (getCurrentManga()) CurrentSettings.hydrate(DEFAULT_MANGA_SETTINGS);
}
