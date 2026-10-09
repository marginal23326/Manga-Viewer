import { CurrentSettings, getCurrentManga } from "@/state";
import { createModal } from "@/components/modal";
import { createSettingsFormElement } from "./form";
import { showShortcutsHelp } from "@/app/shortcuts-help";

const settingsModal = createModal();

// --- UI Interaction ---

export function openSettings(): void {
    const currentManga = getCurrentManga();
    settingsModal.show(() => {
        const snapshot = CurrentSettings.snapshotOverrides();

        const form = createSettingsFormElement({
            isMangaScope: currentManga !== null,
            onResetSettings: () => CurrentSettings.restoreOverrides({}),
            onShowShortcuts: showShortcutsHelp,
        });

        return {
            buttons: [
                {
                    onClick: () => CurrentSettings.restoreOverrides(snapshot),
                    side: "left",
                    text: "Undo changes",
                    type: "secondary",
                },
                { onClick: settingsModal.close, text: "Close", type: "primary" },
            ],
            closedby: "any",
            content: form.element,
            onClose: form.destroy,
            size: "xl",
            title: currentManga ? `Settings for ${currentManga.title}` : "Settings",
        };
    });
}
