import { showModal, hideModal } from "../components/Modal";
import { AppState } from "../core/AppState";
import { setText } from "../core/DOMUtils";
import { getChapterBounds } from "../core/Utils";
import { renderMangaList } from "../ui/HomePageUI";
import { showViewer } from "../ui/ViewerUI";

import { loadChapterImages } from "./ImageManager";
import { createMangaFormElement, getMangaFormData, validateMangaForm, focusAndScrollToInvalidInput } from "./MangaForm";
import { updateImageRangeDisplay } from "./NavigationManager";
import { loadMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";


// --- Data Handling ---

// Load manga list from AppState (already loaded from localStorage by AppState.js)
export function getMangaList() {
    return AppState.mangaList || [];
}

// Update manga list in AppState and re-render UI
function updateMangaState(list) {
    AppState.update("mangaList", list);
    renderMangaList(list);
}

function _calculateMangaProperties(data) {
    const imagesPerChapter = data.userProvidedTotalChapters > 0
            ? Math.max(1, Math.round(data.totalImages / data.userProvidedTotalChapters))
            : data.totalImages; // Default to 1 chapter if totalChapters is 0 or invalid

    const totalChapters = imagesPerChapter > 0 ? Math.ceil(data.totalImages / imagesPerChapter) : 1; // At least one chapter

    return { imagesPerChapter, totalChapters };
}

export function addManga(mangaData) {
    const calculatedProps = _calculateMangaProperties(mangaData);
    const newManga = {
        ...mangaData,
        id: Date.now(),
        ...calculatedProps, // Spread the calculated properties
    };
    updateMangaState([...AppState.mangaList, newManga]);
}

export function editManga(mangaId, updatedData) {
    const index = AppState.mangaList.findIndex((manga) => manga.id === mangaId);
    if (index !== -1) {
        const existingManga = AppState.mangaList[index];
        const calculatedProps = _calculateMangaProperties(updatedData);
        const updatedManga = {
            ...existingManga,
            ...updatedData,
            ...calculatedProps,
        };

        const updatedList = [...AppState.mangaList];
        updatedList[index] = updatedManga;
        updateMangaState(updatedList);

        // If currently viewing this manga, update its state & relevant UI components
        if (AppState.currentManga && AppState.currentManga.id === mangaId) {
            AppState.update("currentManga", updatedManga, true);

            const settings = loadMangaSettings(mangaId);
            const currentChapter = settings.currentChapter || 0;
            updateChapterSelectorOptions(updatedManga.totalChapters, currentChapter);

            const { start, end } = getChapterBounds(updatedManga, currentChapter);
            updateImageRangeDisplay(start + 1, end, updatedManga.totalImages);
        }
    } else {
        console.error("Manga not found for editing:", mangaId);
    }
}

// Called by HomePageUI SortableJS onEnd
export function saveMangaOrder(newOrderIds) {
    const newMangaList = newOrderIds
        .map((idStr) => AppState.mangaList.find((manga) => manga.id.toString() === idStr))
        .filter(Boolean); // Filter out any potential undefined if IDs mismatch

    if (newMangaList.length === AppState.mangaList.length) {
        AppState.update("mangaList", newMangaList);
    } else {
        console.error("Error saving manga order: ID mismatch or missing manga.");
        // Optionally re-render to revert visual order
        renderMangaList(AppState.mangaList);
    }
}

// --- UI Interaction Callbacks ---

const MANGA_MODAL_ID = "manga-details-modal";
const DELETE_MANGA_MODAL_ID = "delete-manga-confirm-modal";

export function openMangaModal(mangaToEdit = null) {
    // 1. Create the form element with initial data if editing
    const formElement = createMangaFormElement(mangaToEdit);

    // 2. Define modal buttons and actions
    const modalButtons = [
        {
            text: "Cancel",
            type: "secondary",
            onClick: () => hideModal(MANGA_MODAL_ID),
        },
        {
            text: mangaToEdit ? "Save Changes" : "Add Manga",
            type: "primary",
            id: "save-manga-btn",
            onClick: () => handleMangaFormSubmit(formElement, mangaToEdit?.id), // Pass form and potential ID
        },
    ];

    // 3. Show the modal
    showModal(MANGA_MODAL_ID, {
        title: mangaToEdit ? "Edit Manga Details" : "Add New Manga",
        content: formElement, // Pass the form element as content
        size: "lg", // Adjust size as needed
        buttons: modalButtons,
        closeOnBackdropClick: false, // Prevent closing on backdrop click for forms
    });
}

// Handles the submission logic for the Add/Edit form
function handleMangaFormSubmit(formElement, editingId = null) {
    // 1. Validate the form
    const invalidInput = validateMangaForm(formElement);
    if (invalidInput) {
        focusAndScrollToInvalidInput(invalidInput);
        // TODO: Show a general error message near the buttons?
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
    const mangaToDelete = AppState.mangaList.find((manga) => manga.id === mangaId);
    if (!mangaToDelete) return;

    const contentElement = document.createElement("p");
    setText(contentElement, `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`);

    const buttons = [
        {
            text: "Cancel",
            type: "secondary",
            onClick: () => {
                hideModal(DELETE_MANGA_MODAL_ID);
            },
        },
        {
            text: "Delete",
            type: "danger",
            onClick: () => {
                const updatedList = AppState.mangaList.filter((manga) => manga.id !== mangaId);
                updateMangaState(updatedList);
                const updatedSettings = { ...AppState.mangaSettings };
                delete updatedSettings[mangaId];
                AppState.update("mangaSettings", updatedSettings);

                hideModal(DELETE_MANGA_MODAL_ID);
            },
        },
    ];

    showModal(DELETE_MANGA_MODAL_ID, {
        title: "Delete Manga?",
        content: contentElement,
        size: "sm",
        buttons: buttons,
        closeOnBackdropClick: false,
    });
}

// Function called by card click
export function loadMangaForViewing(manga) {
    AppState.update("currentManga", manga, true);
    const settings = loadMangaSettings(manga.id);
    if (AppState.update("currentView", "viewer")) {
        showViewer();
    }
    // Use setTimeout to ensure view switch completes before loading images
    setTimeout(() => loadChapterImages(settings.currentChapter || 0), 50);
}
