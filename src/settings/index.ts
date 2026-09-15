import { CurrentSettings, DEFAULT_MANGA_SETTINGS, SettingsStore, getCurrentManga } from "@/state";
import { type MangaFormHandle, createMangaFormElement } from "@/library/manga-form";
import { type SettingsForm, createSettingsFormElement } from "./form";
import { hideModal, showModal } from "@/components/modal";
import { editManga } from "@/library/manga-actions";
import { showShortcutsHelp } from "@/app/shortcuts-help";

const SETTINGS_MODAL_ID = "settings-modal";

interface SettingsSession {
    form: SettingsForm;
    mangaForm: MangaFormHandle | null;
}

let session: SettingsSession | null = null;

function revealTabFor(element: HTMLElement): void {
    const tabPane = element.closest<HTMLElement>('[data-tab-panel="true"]');
    if (tabPane && session) session.form.tabs.switchTo(tabPane);
}

// --- UI Interaction ---

export function openSettings(): void {
    if (session) return;

    const currentManga = getCurrentManga();
    const mangaForm = currentManga ? createMangaFormElement(currentManga) : null;

    const form = createSettingsFormElement({
        mangaElement: mangaForm?.element,
        onResetSettings: () => CurrentSettings.hydrate(DEFAULT_MANGA_SETTINGS),
        onShowShortcuts: showShortcutsHelp,
    });

    session = { form, mangaForm };

    showModal(SETTINGS_MODAL_ID, {
        buttons: [
            { onClick: () => hideModal(SETTINGS_MODAL_ID), side: "left", text: "Cancel", type: "secondary" },
            { onClick: handleSettingsSave, text: "Save settings", type: "primary" },
        ],
        content: form.element,
        onClose: handleModalClose,
        size: "xl",
        title: currentManga ? `Settings · ${currentManga.title}` : "Settings",
    });
}

function handleModalClose(): void {
    if (!session) return;

    SettingsStore.discardDraft();

    session.form.destroy();
    session = null;
}

function handleSettingsSave(): void {
    if (!session) return;
    const { form, mangaForm } = session;

    const invalidField = form.element.querySelector<HTMLInputElement>(":invalid");
    if (invalidField) {
        revealTabFor(invalidField);
        invalidField.reportValidity();
        return;
    }

    const currentManga = getCurrentManga();
    const validatedFormData = mangaForm ? mangaForm.getValidatedData() : null;
    if (mangaForm && !validatedFormData) {
        revealTabFor(mangaForm.element);
        mangaForm.element.reportValidity();
        return;
    }

    if (currentManga && validatedFormData) void editManga(currentManga.id, validatedFormData);

    SettingsStore.flush();
    hideModal(SETTINGS_MODAL_ID);
}
