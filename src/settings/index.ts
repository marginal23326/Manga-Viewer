import { CurrentSettings, DEFAULT_MANGA_SETTINGS } from "@/state";
import { type SettingsForm, createSettingsFormElement } from "./form";
import { hideModal, showModal } from "@/components/modal";
import type { ConfiguredMangaSettings } from "@/types";
import { showShortcutsHelp } from "@/app/shortcuts-help";

const SETTINGS_MODAL_ID = "settings-modal";

const SETTING_KEYS = Object.keys(DEFAULT_MANGA_SETTINGS) as (keyof ConfiguredMangaSettings)[];

let openForm: SettingsForm | null = null;

function applySettings(source: ConfiguredMangaSettings): void {
    for (const key of SETTING_KEYS) {
        CurrentSettings.update(key, source[key]);
    }
}

// --- UI Interaction ---

export function openSettings(): void {
    if (openForm) return;

    // Data fields only: the state's methods live on the prototype.
    const snapshot: ConfiguredMangaSettings = { ...CurrentSettings };

    const form = createSettingsFormElement({
        onResetSettings: () => applySettings(DEFAULT_MANGA_SETTINGS),
        onShowShortcuts: showShortcutsHelp,
    });

    openForm = form;

    showModal(SETTINGS_MODAL_ID, {
        buttons: [
            { onClick: () => applySettings(snapshot), side: "left", text: "Undo changes", type: "secondary" },
            { onClick: () => hideModal(SETTINGS_MODAL_ID), text: "Close", type: "primary" },
        ],
        closeOnBackdropClick: true,
        content: form.element,
        onClose: () => {
            openForm?.destroy();
            openForm = null;
        },
        size: "xl",
        title: "Settings",
    });
}
