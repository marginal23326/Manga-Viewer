import { showModal, hideModal } from "../components/Modal";
import { setText } from "../core/DOMUtils";
import { getSettings } from "../core/MangaSettings";
import { PersistState, UIState } from "../core/State";
import { getChapterBounds } from "../core/Utils";
import { showViewer } from "../ui/ViewerUI";

import { loadChapterImages } from "./ImageManager";
import {
    createMangaFormElement,
    getMangaFormData,
    validateMangaForm,
    focusAndScrollToInvalidInput,
    showFormError,
} from "./MangaForm";
import { updateImageRangeDisplay } from "./NavigationManager";
import { applyMangaSettings } from "./SettingsManager";
import { updateChapterSelectorOptions } from "./SidebarManager";

let pendingViewerLoadTimeout = null;

export function cancelPendingViewerLoad() {
    if (pendingViewerLoadTimeout) {
        clearTimeout(pendingViewerLoadTimeout);
        pendingViewerLoadTimeout = null;
    }
}

export function getMangaList() {
    return PersistState.mangaList || [];
}

export function getCurrentManga() {
    const id = PersistState.currentMangaId;
    if (id == null) return null;
    return PersistState.mangaList.find((m) => m.id === id) || null;
}

function updateMangaState(list) {
    PersistState.update("mangaList", list);
}

function _calculateMangaProperties(data) {
    const imagesPerChapter =
        data.userProvidedTotalChapters > 0
            ? Math.max(1, Math.round(data.totalImages / data.userProvidedTotalChapters))
            : data.totalImages; // Default to 1 chapter if totalChapters is 0 or invalid

    const totalChapters = imagesPerChapter > 0 ? Math.ceil(data.totalImages / imagesPerChapter) : 1; // At least one chapter

    return { imagesPerChapter, totalChapters };
}

function addManga(mangaData) {
    const calculatedProps = _calculateMangaProperties(mangaData);
    const newManga = {
        ...mangaData,
        id: Date.now(),
        ...calculatedProps, // Spread the calculated properties
    };
    updateMangaState([...getMangaList(), newManga]);
}

export function editManga(mangaId, updatedData) {
    const currentList = getMangaList();
    const index = currentList.findIndex((manga) => manga.id === mangaId);
    if (index !== -1) {
        const existingManga = currentList[index];
        const calculatedProps = _calculateMangaProperties(updatedData);
        const updatedManga = {
            ...existingManga,
            ...updatedData,
            ...calculatedProps,
        };

        const updatedList = [...currentList];
        updatedList[index] = updatedManga;
        updateMangaState(updatedList);

        // If currently viewing this manga, update relevant UI components
        if (PersistState.currentMangaId === mangaId) {
            const settings = getSettings(mangaId);
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
    const currentList = getMangaList();
    const newMangaList = newOrderIds
        .map((idStr) => currentList.find((manga) => manga.id.toString() === idStr))
        .filter(Boolean); // Filter out any potential undefined if IDs mismatch

    if (newMangaList.length === currentList.length) {
        PersistState.update("mangaList", newMangaList);
    } else {
        PersistState.dispatchEvent(new CustomEvent("state:mangaList", { detail: currentList }));
    }
}

// --- UI Interaction Callbacks ---

const MANGA_MODAL_ID = "manga-details-modal";
const DELETE_MANGA_MODAL_ID = "delete-manga-confirm-modal";

export function openMangaModal(mangaToEdit = null) {
    const formElement = createMangaFormElement(mangaToEdit);

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
            onClick: () => handleMangaFormSubmit(formElement, "manga-form-error", mangaToEdit?.id),
        },
    ];

    showModal(MANGA_MODAL_ID, {
        title: mangaToEdit ? "Edit Manga Details" : "Add New Manga",
        content: formElement,
        size: "lg",
        buttons: modalButtons,
        errorElementId: "manga-form-error",
        closeOnBackdropClick: false,
    });
}

// Handles the submission logic for the Add/Edit form
function handleMangaFormSubmit(formElement, errorElementId, editingId = null) {
    // 1. Validate the form
    const invalidInput = validateMangaForm(formElement);
    if (invalidInput) {
        focusAndScrollToInvalidInput(invalidInput);
        showFormError(errorElementId, invalidInput);
        return;
    }

    showFormError(errorElementId);

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

export function confirmAndDelete(idsToDelete) {
    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) return;

    const currentList = getMangaList();
    const isSingleDelete = idsToDelete.length === 1;
    const mangaToDelete = isSingleDelete ? currentList.find((m) => m.id === idsToDelete[0]) : null;

    // Determine title and content for the modal
    const title = `Delete ${isSingleDelete ? "Manga" : `${idsToDelete.length} Manga`}?`;
    const contentElement = document.createElement("p");
    const contentText =
        isSingleDelete && mangaToDelete
            ? `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`
            : `Are you sure you want to delete these ${idsToDelete.length} items? This cannot be undone.`;
    setText(contentElement, contentText);

    const buttons = [
        {
            text: "Cancel",
            type: "secondary",
            onClick: () => hideModal(DELETE_MANGA_MODAL_ID),
        },
        {
            text: "Delete",
            type: "danger",
            onClick: () => {
                // Filter the list and settings based on the IDs
                const updatedList = currentList.filter((manga) => !idsToDelete.includes(manga.id));
                const updatedSettings = { ...PersistState.mangaSettings };
                idsToDelete.forEach((id) => delete updatedSettings[id]);

                // Update state
                updateMangaState(updatedList);
                PersistState.update("mangaSettings", updatedSettings);

                // If it was a multi-delete, exit select mode
                if (!isSingleDelete) {
                    UIState.update("selectedMangaIds", []);
                    UIState.update("isSelectModeEnabled", false);
                }

                hideModal(DELETE_MANGA_MODAL_ID);
            },
        },
    ];

    showModal(DELETE_MANGA_MODAL_ID, {
        title,
        content: contentElement,
        size: "sm",
        buttons,
        closeOnBackdropClick: false,
    });
}

// Function called by card click
export function loadMangaForViewing(manga) {
    cancelPendingViewerLoad();

    PersistState.update("currentMangaId", manga.id);
    const settings = getSettings(manga.id);
    if (PersistState.update("currentView", "viewer")) {
        showViewer();
    }
    // Apply manga-specific settings to UI components
    applyMangaSettings();
    // Use setTimeout to ensure view switch completes before loading images
    pendingViewerLoadTimeout = setTimeout(() => {
        pendingViewerLoadTimeout = null;
        if (PersistState.currentView !== "viewer" || PersistState.currentMangaId !== manga.id) {
            return;
        }
        loadChapterImages(settings.currentChapter || 0);
    }, 50);
}
