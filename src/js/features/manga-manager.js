import { PersistState, UIState } from "../state/state";
import {
    createMangaFormElement,
    focusAndScrollToInvalidInput,
    getMangaFormData,
    showFormError,
    validateMangaForm,
} from "./manga-form";
import { hideModal, showModal } from "../components/modal";
import { AppEvents } from "../core/app-events";
import { getChapterBounds } from "../core/utils";
import { getMangaList } from "../state/manga-library";
import { getSettings } from "../state/manga-settings";
import { h } from "../core/dom-utils";
import { loadChapterImages } from "./image-manager";
import { showViewer } from "../ui/viewer-ui";
import { updateImageRangeDisplay } from "../viewer/status-display";

let pendingViewerLoadTimeout = null;

function cancelPendingViewerLoad() {
    if (pendingViewerLoadTimeout) {
        clearTimeout(pendingViewerLoadTimeout);
        pendingViewerLoadTimeout = null;
    }
}

function updateMangaState(list) {
    PersistState.update("mangaList", list);
}

function calculateMangaProperties(data) {
    // Default to a single chapter if totalChapters is 0 or invalid.
    const imagesPerChapter =
        data.userProvidedTotalChapters > 0
            ? Math.max(1, Math.round(data.totalImages / data.userProvidedTotalChapters))
            : data.totalImages;

    // Guarantee at least one chapter.
    const totalChapters = imagesPerChapter > 0 ? Math.ceil(data.totalImages / imagesPerChapter) : 1;

    return { imagesPerChapter, totalChapters };
}

function addManga(mangaData) {
    const calculatedProps = calculateMangaProperties(mangaData);
    const newManga = {
        ...mangaData,
        id: Date.now(),
        ...calculatedProps,
    };
    updateMangaState([...getMangaList(), newManga]);
}

export function editManga(mangaId, updatedData) {
    const currentList = getMangaList();
    const index = currentList.findIndex((manga) => manga.id === mangaId);
    if (index === -1) {
        console.error("Manga not found for editing:", mangaId);
        return;
    }
    const existingManga = currentList[index];
    const calculatedProps = calculateMangaProperties(updatedData);
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
        AppEvents.dispatchEvent(
            new CustomEvent("chapterSelectorSync", {
                detail: { currentChapter, totalChapters: updatedManga.totalChapters },
            }),
        );

        const { start, end } = getChapterBounds(updatedManga, currentChapter);
        updateImageRangeDisplay(start + 1, end, updatedManga.totalImages);
    }
}

// Called by HomePageUI SortableJS onEnd
export function saveMangaOrder(newOrderIds) {
    const currentList = getMangaList();
    // Drop any entries whose manga could not be found (e.g. deleted IDs).
    const newMangaList = newOrderIds
        .map((idStr) => currentList.find((manga) => manga.id.toString() === idStr))
        .filter(Boolean);

    if (newMangaList.length === currentList.length) {
        PersistState.update("mangaList", newMangaList);
    } else {
        PersistState.notify("mangaList");
    }
}

// --- UI Interaction Callbacks ---

const MANGA_MODAL_ID = "manga-details-modal";
const DELETE_MANGA_MODAL_ID = "delete-manga-confirm-modal";

export function openMangaModal(mangaToEdit = null) {
    const formElement = createMangaFormElement(mangaToEdit);

    const modalButtons = [
        {
            onClick: () => hideModal(MANGA_MODAL_ID),
            text: "Cancel",
            type: "secondary",
        },
        {
            id: "save-manga-btn",
            onClick: () => handleMangaFormSubmit(formElement, "manga-form-error", mangaToEdit?.id),
            text: mangaToEdit ? "Save Changes" : "Add Manga",
            type: "primary",
        },
    ];

    showModal(MANGA_MODAL_ID, {
        buttons: modalButtons,
        closeOnBackdropClick: false,
        content: formElement,
        errorElementId: "manga-form-error",
        size: "lg",
        title: mangaToEdit ? "Edit Manga Details" : "Add New Manga",
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
    const contentText =
        isSingleDelete && mangaToDelete
            ? `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`
            : `Are you sure you want to delete these ${idsToDelete.length} items? This cannot be undone.`;
    const contentElement = h("p", {}, contentText);

    const buttons = [
        {
            onClick: () => hideModal(DELETE_MANGA_MODAL_ID),
            text: "Cancel",
            type: "secondary",
        },
        {
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
            text: "Delete",
            type: "danger",
        },
    ];

    showModal(DELETE_MANGA_MODAL_ID, {
        buttons,
        closeOnBackdropClick: false,
        content: contentElement,
        size: "sm",
        title,
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
    // Use setTimeout to ensure view switch completes before loading images
    pendingViewerLoadTimeout = setTimeout(() => {
        pendingViewerLoadTimeout = null;
        if (PersistState.currentView !== "viewer" || PersistState.currentMangaId !== manga.id) {
            return;
        }
        loadChapterImages(settings.currentChapter || 0);
    }, 50);
}
