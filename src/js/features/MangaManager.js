import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { renderMangaList } from '../ui/HomePageUI';
import { showModal, hideModal } from '../components/Modal'; // Use the real Modal component
import { showConfirmationDialog } from '../components/ConfirmationDialog'; // Placeholder
import { loadMangaSettings, saveMangaSettings } from './SettingsManager';
import { loadChapterImages } from './ImageManager';
import { $, getDataAttribute } from '../core/DOMUtils';
import { createMangaFormElement, getMangaFormData, validateMangaForm } from './MangaForm';

// --- Data Handling ---

// Load manga list from AppState (already loaded from localStorage by AppState.js)
export function getMangaList() {
    return AppState.mangaList || [];
}

// Update manga list in AppState and re-render UI
function updateMangaState(list) {
    AppState.update('mangaList', list);
    renderMangaList(list);
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

    updateMangaState([...AppState.mangaList, newManga]);
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

        const updatedList = [...AppState.mangaList];
        updatedList[index] = updatedManga;
        updateMangaState(updatedList);

        // If currently viewing this manga, update its state too
        if (AppState.currentManga && AppState.currentManga.id === mangaId) {
            AppState.update('currentManga', updatedManga, true); // Update state & save
            // Potentially trigger a reload of the viewer if chapter structure changed significantly
             // import { reloadCurrentChapter } from './ImageManager';
             // reloadCurrentChapter(); // Or show a notification
        }
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
        AppState.update('mangaList', newMangaList);
    } else {
        console.error("Error saving manga order: ID mismatch or missing manga.");
        // Optionally re-render to revert visual order
        renderMangaList(AppState.mangaList);
    }
}

// --- UI Interaction Callbacks ---

const MANGA_MODAL_ID = 'manga-details-modal';

export function openMangaModal(mangaToEdit = null) {
    // 1. Create the form element with initial data if editing
    const formElement = createMangaFormElement(mangaToEdit);

    // 2. Define modal buttons and actions
    const modalButtons = [
        {
            text: 'Cancel',
            type: 'secondary',
            onClick: () => hideModal(MANGA_MODAL_ID)
        },
        {
            text: mangaToEdit ? 'Save Changes' : 'Add Manga',
            type: 'primary',
            id: 'save-manga-btn',
            onClick: () => handleMangaFormSubmit(formElement, mangaToEdit?.id) // Pass form and potential ID
        }
    ];

    // 3. Show the modal
    showModal(MANGA_MODAL_ID, {
        title: mangaToEdit ? 'Edit Manga Details' : 'Add New Manga',
        content: formElement, // Pass the form element as content
        size: 'lg', // Adjust size as needed
        buttons: modalButtons,
        closeOnBackdropClick: false // Prevent closing on backdrop click for forms
    });
}

// Handles the submission logic for the Add/Edit form
function handleMangaFormSubmit(formElement, editingId = null) {
    // 1. Validate the form
    if (!validateMangaForm(formElement)) {
        // TODO: Show a general error message near the buttons
        return;
    }

    // 2. Get data from the form
    const formData = getMangaFormData(formElement);
    if (!formData) {
        console.error("Could not get form data.");
        return;
    }

    // 3. Call add or edit based on whether an ID was passed
    if (editingId) {
        editManga(editingId, formData);
    } else {
        addManga(formData);
    }

    // 4. Close the modal on successful submission
    hideModal(MANGA_MODAL_ID);
}


// Function called by Delete button on cards
export function deleteManga(mangaId) {
    const mangaToDelete = AppState.mangaList.find(manga => manga.id === mangaId);
    if (!mangaToDelete) return;

    showConfirmationDialog({ // Use placeholder
        title: 'Delete Manga?',
        message: `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: () => {
            const updatedList = AppState.mangaList.filter(manga => manga.id !== mangaId);
            updateMangaState(updatedList);
            const updatedSettings = { ...AppState.mangaSettings };
            delete updatedSettings[mangaId];
            AppState.update('mangaSettings', updatedSettings);
        }
    });
}

// Function called by card click
export function loadMangaForViewing(manga) {
    AppState.update('currentManga', manga, true);
    const settings = loadMangaSettings(manga.id);
    AppState.update('currentView', 'viewer');
    // Use setTimeout to ensure view switch completes before loading images
    setTimeout(() => loadChapterImages(settings.currentChapter || 0), 50);
}