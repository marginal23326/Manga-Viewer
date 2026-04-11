import { PersistState } from "../core/State";

import { getCurrentManga } from "./MangaManager";
import { resetScrollAndLoadChapter } from "./ImageManager";
import { loadMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";

// Called by the CustomSelect's onChange callback
export function jumpToChapter(selectedValue) {
    const manga = getCurrentManga();
    if (!manga) return;

    const selectedChapter = typeof selectedValue === "string" ? parseInt(selectedValue, 10) : selectedValue;

    if (
        selectedValue !== "" &&
        !isNaN(selectedChapter) &&
        selectedChapter >= 0 &&
        selectedChapter < manga.totalChapters
    ) {
        resetScrollAndLoadChapter(selectedChapter);
    } else if (selectedValue !== "") {
        console.warn("Invalid chapter selected:", selectedValue);
    }
}

export function initChapterManager() {
    const manga = getCurrentManga();
    if (PersistState.currentView === "viewer" && manga) {
        const settings = loadMangaSettings(manga.id);
        updateChapterSelectorOptions(manga.totalChapters, settings.currentChapter || 0);
    }
}
