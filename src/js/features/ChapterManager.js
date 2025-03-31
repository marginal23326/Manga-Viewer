import { AppState } from '../core/AppState';
import { loadChapterImages } from './ImageManager';
import { updateChapterSelectorOptions } from './SidebarManager';

// Called when the chapter selector dropdown value changes
export function jumpToChapter(event) {
    if (!AppState.currentManga || !event || !event.target) return;

    const selectedChapter = parseInt(event.target.value, 10);

    if (!isNaN(selectedChapter) && selectedChapter >= 0 && selectedChapter < AppState.currentManga.totalChapters) {
        // Check if it's different from the current chapter to avoid unnecessary reloads
        // import { getCurrentChapterIndex } from './ImageManager'; // Need a way to get current index
        // if (selectedChapter !== getCurrentChapterIndex()) {
             loadChapterImages(selectedChapter);
        // }
    } else {
        console.warn("Invalid chapter selected:", event.target.value);
    }
}

// Update the options in the dropdown (called by ImageManager after chapter load)
export function updateChapterDropdown(totalChapters, currentChapter) {
    updateChapterSelectorOptions(totalChapters, currentChapter); // Forward call to SidebarManager
}

export function initChapterManager() {
    // Initial population of dropdown if viewer is visible on load
    if (AppState.currentView === 'viewer' && AppState.currentManga) {
        const settings = loadMangaSettings(AppState.currentManga.id);
        updateChapterDropdown(AppState.currentManga.totalChapters, settings.currentChapter || 0);
    }
    console.log("Chapter Manager Initialized.");
}