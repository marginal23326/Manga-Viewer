import { AppState } from "../core/AppState";
import { resetScrollAndLoadChapter } from "./ImageManager";
import { loadMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";

// Called by the CustomSelect's onChange callback
export function jumpToChapter(selectedValue) {
    if (!AppState.currentManga) return;

    const selectedChapter = typeof selectedValue === "string" ? parseInt(selectedValue, 10) : selectedValue;

    if (selectedValue !== "" &&
        !isNaN(selectedChapter) &&
        selectedChapter >= 0 &&
        selectedChapter < AppState.currentManga.totalChapters
    ) {
        resetScrollAndLoadChapter(selectedChapter);
    } else if (selectedValue !== "") {
        console.warn("Invalid chapter selected:", selectedValue);
    }
}

export function initChapterManager() {
    // Initial population of dropdown if viewer is visible on load
    if (AppState.currentView === "viewer" && AppState.currentManga) {
        const settings = loadMangaSettings(AppState.currentManga.id);
        updateChapterSelectorOptions(AppState.currentManga.totalChapters, settings.currentChapter || 0);
    }
}
