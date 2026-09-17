import { CurrentSettings, DEFAULT_MANGA_SETTINGS } from "@/state";
import type { ConfiguredMangaSettings } from "@/types";
import { createModal } from "@/components/modal";
import { createSettingsFormElement } from "./form";
import { showShortcutsHelp } from "@/app/shortcuts-help";

const SETTING_KEYS = Object.keys(DEFAULT_MANGA_SETTINGS) as (keyof ConfiguredMangaSettings)[];
const settingsModal = createModal();

function applySettings(source: ConfiguredMangaSettings): void {
    for (const key of SETTING_KEYS) {
        CurrentSettings.update(key, source[key]);
    }
}

// --- UI Interaction ---

export function openSettings(): void {
    settingsModal.show(() => {
        // Data fields only: the state's methods live on the prototype.
        const snapshot: ConfiguredMangaSettings = { ...CurrentSettings };

        const form = createSettingsFormElement({
            onResetSettings: () => applySettings(DEFAULT_MANGA_SETTINGS),
            onShowShortcuts: showShortcutsHelp,
        });

        return {
            buttons: [
                { onClick: () => applySettings(snapshot), side: "left", text: "Undo changes", type: "secondary" },
                { onClick: settingsModal.close, text: "Close", type: "primary" },
            ],
            closeOnBackdropClick: true,
            content: form.element,
            onClose: form.destroy,
            size: "xl",
            title: "Settings",
        };
    });
}
