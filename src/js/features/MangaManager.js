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

// --- UI Interaction Callbacks ---

const MANGA_MODAL_ID = 'manga-details-modal';

export function openMangaModal(mangaToEdit = null) {
    console.log("Opening manga modal for:", mangaToEdit ? `Edit ${mangaToEdit.title}` : "Add New");

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
        console.warn("Manga form validation failed.");
        // Optionally show a general error message near the buttons
        return; // Stop submission if invalid
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

    console.log("Requesting delete confirmation for:", mangaToDelete.title);
    showConfirmationDialog({ // Use placeholder
        title: 'Delete Manga?',
        message: `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        onConfirm: () => {
            AppState.mangaList = AppState.mangaList.filter(manga => manga.id !== mangaId);
            saveMangaListToStorage();
            renderMangaList(AppState.mangaList);
            delete AppState.mangaSettings[mangaId];
            AppState.update('mangaSettings', AppState.mangaSettings);
            console.log("Manga deleted:", mangaToDelete.title);
        }
    });
}

// Function called by card click
export function loadMangaForViewing(manga) {
    console.log("Loading manga for viewing:", manga.title);
    if (AppState.currentManga) { /* save scroll */ }
    AppState.update('currentManga', manga, false);
    const settings = loadMangaSettings(manga.id);
    AppState.update('currentView', 'viewer');
    // Use setTimeout to ensure view switch completes before loading images
    setTimeout(() => loadChapterImages(settings.currentChapter || 0), 50);
}

// --- Initialization ---
// (No specific init needed here, functions are called by UI)
export function initMangaManager() {
    // Placeholder if any setup is needed in the future
    console.log("Manga Manager Initialized (Data Ready).");
    return Promise.resolve(); // Return promise if async setup needed later
}