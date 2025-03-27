import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { renderMangaList } from '../ui/HomePageUI';
import { showModal, hideModal } from '../components/Modal'; // Will create Modal component later
import { showConfirmationDialog } from '../components/ConfirmationDialog'; // Will create later
import { loadMangaSettings, saveMangaSettings } from './SettingsManager'; // Will create later
import { $ } from '../core/DOMUtils';

// --- Data Handling ---

// Load manga list from AppState (already loaded from localStorage by AppState.js)
export function getMangaList() {
    return AppState.mangaList || [];
}

// Save the current manga list order/content to AppState and localStorage
function saveMangaListToStorage() {
    AppState.update('mangaList', AppState.mangaList);
}

// --- Core Actions ---

export function addManga(mangaData) {
    const newManga = {
        ...mangaData,
        id: Date.now(), // Simple unique ID using timestamp
        // Calculate derived properties (ensure data is valid)
        imagesPerChapter: mangaData.userProvidedTotalChapters > 0
            ? Math.max(1, Math.round(mangaData.totalImages / mangaData.userProvidedTotalChapters))
            : mangaData.totalImages, // Default to 1 chapter if totalChapters is 0 or invalid
    };
    // Ensure totalChapters is calculated correctly
     newManga.totalChapters = newManga.imagesPerChapter > 0
            ? Math.ceil(newManga.totalImages / newManga.imagesPerChapter)
            : 1; // At least one chapter

    AppState.mangaList.push(newManga);
    saveMangaListToStorage();
    renderMangaList(AppState.mangaList); // Update UI
    console.log("Manga added:", newManga.title);
}

export function editManga(mangaId, updatedData) {
    const index = AppState.mangaList.findIndex(manga => manga.id === mangaId);
    if (index !== -1) {
        const existingManga = AppState.mangaList[index];
        const updatedManga = {
            ...existingManga,
            ...updatedData,
        };
        // Recalculate derived properties
        updatedManga.imagesPerChapter = updatedData.userProvidedTotalChapters > 0
            ? Math.max(1, Math.round(updatedData.totalImages / updatedData.userProvidedTotalChapters))
            : updatedData.totalImages;
         updatedManga.totalChapters = updatedManga.imagesPerChapter > 0
            ? Math.ceil(updatedData.totalImages / updatedManga.imagesPerChapter)
            : 1;

        AppState.mangaList[index] = updatedManga;
        saveMangaListToStorage();
        renderMangaList(AppState.mangaList); // Update UI

        // If currently viewing this manga, update its state too
        if (AppState.currentManga && AppState.currentManga.id === mangaId) {
            AppState.update('currentManga', updatedManga, false); // Update state without saving list again
            // Potentially trigger a reload of the viewer if chapter structure changed significantly
             // import { reloadCurrentChapter } from './ImageManager';
             // reloadCurrentChapter(); // Or show a notification
        }
        console.log("Manga updated:", updatedManga.title);
    } else {
        console.error("Manga not found for editing:", mangaId);
    }
}

// Called by HomePageUI SortableJS onEnd
export function saveMangaOrder(newOrderIds) {
    const newMangaList = newOrderIds
        .map(idStr => AppState.mangaList.find(manga => manga.id.toString() === idStr))
        .filter(Boolean); // Filter out any potential undefined if IDs mismatch

    if (newMangaList.length === AppState.mangaList.length) {
        AppState.mangaList = newMangaList;
        saveMangaListToStorage();
        console.log("Manga order saved.");
    } else {
        console.error("Error saving manga order: ID mismatch or missing manga.");
        // Optionally re-render to revert visual order
        renderMangaList(AppState.mangaList);
    }
}

// --- UI Interaction Callbacks (used by HomePageUI/Modals) ---

// Function called by Add/Edit buttons on cards or Add Manga button
export function openMangaModal(mangaToEdit = null) {
    console.log("Opening manga modal for:", mangaToEdit ? `Edit ${mangaToEdit.title}` : "Add New");
    // TODO: Implement Modal component and form rendering
    // showModal('manga-form-modal', {
    //     title: mangaToEdit ? 'Edit Manga' : 'Add Manga',
    //     initialData: mangaToEdit,
    //     onSubmit: (formData) => {
    //         if (mangaToEdit) {
    //             editManga(mangaToEdit.id, formData);
    //         } else {
    //             addManga(formData);
    //         }
    //     }
    // });
    alert(`Placeholder: ${mangaToEdit ? 'Edit' : 'Add'} Manga Modal`); // Placeholder
}

// Function called by Delete button on cards
export function deleteManga(mangaId) {
    const mangaToDelete = AppState.mangaList.find(manga => manga.id === mangaId);
    if (!mangaToDelete) return;

    console.log("Requesting delete confirmation for:", mangaToDelete.title);
    // TODO: Implement ConfirmationDialog component
    // showConfirmationDialog({
    //     title: 'Delete Manga?',
    //     message: `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`,
    //     confirmText: 'Delete',
    //     cancelText: 'Cancel',
    //     onConfirm: () => {
    //         AppState.mangaList = AppState.mangaList.filter(manga => manga.id !== mangaId);
    //         saveMangaListToStorage();
    //         renderMangaList(AppState.mangaList); // Update UI
    //         // Also delete associated settings
    //         delete AppState.mangaSettings[mangaId];
    //         AppState.update('mangaSettings', AppState.mangaSettings);
    //         console.log("Manga deleted:", mangaToDelete.title);
    //     }
    // });
    if (confirm(`Are you sure you want to delete "${mangaToDelete.title}"?`)) { // Placeholder
         AppState.mangaList = AppState.mangaList.filter(manga => manga.id !== mangaId);
         saveMangaListToStorage();
         renderMangaList(AppState.mangaList); // Update UI
         // Also delete associated settings
         delete AppState.mangaSettings[mangaId];
         AppState.update('mangaSettings', AppState.mangaSettings);
         console.log("Manga deleted:", mangaToDelete.title);
    }
}

// Function called by card click
export function loadMangaForViewing(manga) {
    console.log("Loading manga for viewing:", manga.title);
    // Save scroll position of previous manga if applicable
    if (AppState.currentManga) {
        // import { saveCurrentScrollPosition } from './ImageManager'; // Will create later
        // saveCurrentScrollPosition();
    }

    AppState.update('currentManga', manga, false); // Update state but don't save list again

    // Load specific settings for this manga
    const settings = loadMangaSettings(manga.id); // From SettingsManager

    // Switch view
    AppState.update('currentView', 'viewer');

    // Trigger image loading for the viewer
    // import { loadChapterImages } from './ImageManager'; // Will create later
    // loadChapterImages(settings.currentChapter || 0); // Load current or first chapter

    // Restore scroll position after images load (handled within ImageManager)
}

// --- Initialization ---
// (No specific init needed here, functions are called by UI)
export function initMangaManager() {
    // Placeholder if any setup is needed in the future
    console.log("Manga Manager Initialized (Data Ready).");
    return Promise.resolve(); // Return promise if async setup needed later
}