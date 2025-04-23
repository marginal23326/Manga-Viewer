import { State } from "../core/State";

import { resetScrollAndLoadChapter } from "./ImageManager";
import { loadMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";

// Called by the CustomSelect's onChange callback
export function jumpToChapter(selectedValue) {
    if (!State.currentManga) return;

    const selectedChapter = typeof selectedValue === "string" ? parseInt(selectedValue, 10) : selectedValue;

    if (selectedValue !== "" &&
        !isNaN(selectedChapter) &&
        selectedChapter >= 0 &&
        selectedChapter < State.currentManga.totalChapters
    ) {
        resetScrollAndLoadChapter(selectedChapter);
    } else if (selectedValue !== "") {
        console.warn("Invalid chapter selected:", selectedValue);
    }
}

export function initChapterManager() {
    // Initial population of dropdown if viewer is visible on load
    if (State.currentView === "viewer" && State.currentManga) {
        const settings = loadMangaSettings(State.currentManga.id);
        updateChapterSelectorOptions(State.currentManga.totalChapters, settings.currentChapter || 0);
    }
}
