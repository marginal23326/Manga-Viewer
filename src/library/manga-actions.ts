import type { Manga, MangaFormData } from "@/types";
import { PersistState, UIState } from "@/state";
import { confirmModal, hideModal, showModal } from "@/components/modal";
import { createMangaFormElement, getMangaFormData, validateAndReport } from "./manga-form";
import { getChapterBounds, getTotalChapters, waitForNextPaint } from "@/core/utils";
import { emitAppEvent } from "@/core/app-events";
import { getMangaList } from "@/state/manga-library";
import { getSettings } from "@/state/manga-settings";
import { h } from "@/core/dom-utils";
import { loadChapterImages } from "@/viewer/chapter";
import { showViewer } from "@/app/view-router";
import { updateImageRangeDisplay } from "@/viewer/status-display";

function updateMangaState(list: Manga[]): void {
    PersistState.update("mangaList", list);
}

function addManga(mangaData: MangaFormData): void {
    const newManga: Manga = { ...mangaData, id: crypto.randomUUID() };
    updateMangaState([...getMangaList(), newManga]);
}

export function editManga(mangaId: string, updatedData: MangaFormData): void {
    const currentList = getMangaList();
    const index = currentList.findIndex((manga) => manga.id === mangaId);
    const existingManga = currentList[index];
    if (index === -1 || !existingManga) {
        console.error("Manga not found for editing:", mangaId);
        return;
    }
    const updatedManga: Manga = { ...existingManga, ...updatedData };

    const updatedList = [...currentList];
    updatedList[index] = updatedManga;
    updateMangaState(updatedList);

    if (PersistState.currentMangaId === mangaId) {
        const settings = getSettings(mangaId);
        const currentChapter = settings.currentChapter ?? 0;
        emitAppEvent("chapterSelectorSync", { currentChapter, totalChapters: getTotalChapters(updatedManga) });

        const { start, end } = getChapterBounds(updatedManga, currentChapter);
        updateImageRangeDisplay(start + 1, end, updatedManga.totalImages);
    }
}

export function saveMangaOrder(newOrderIds: string[]): void {
    const currentList = getMangaList();
    const newMangaList = newOrderIds
        .map((idStr) => currentList.find((manga) => manga.id === idStr))
        .filter((manga): manga is Manga => Boolean(manga));

    if (newMangaList.length === currentList.length) {
        PersistState.update("mangaList", newMangaList);
    } else {
        PersistState.notify("mangaList");
    }
}

const MANGA_MODAL_ID = "manga-details-modal";
const DELETE_MANGA_MODAL_ID = "delete-manga-confirm-modal";

export function openMangaModal(mangaToEdit: Manga | null = null): void {
    const formElement = createMangaFormElement(mangaToEdit);

    const modalButtons = [
        {
            onClick: () => hideModal(MANGA_MODAL_ID),
            text: "Cancel",
            type: "secondary" as const,
        },
        {
            id: "save-manga-btn",
            onClick: () => handleMangaFormSubmit(formElement, "manga-form-error", mangaToEdit?.id),
            text: mangaToEdit ? "Save Changes" : "Add Manga",
            type: "primary" as const,
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

function handleMangaFormSubmit(formElement: HTMLFormElement, errorElementId: string, editingId?: string): void {
    if (!validateAndReport(formElement, errorElementId)) return;

    const formData = getMangaFormData(formElement);
    if (!formData) {
        console.error("Could not get form data.");
        return;
    }

    if (editingId) {
        editManga(editingId, formData);
    } else {
        addManga(formData);
    }

    hideModal(MANGA_MODAL_ID);
}

export function confirmAndDelete(idsToDelete: string[]): void {
    if (idsToDelete.length === 0) return;

    const currentList = getMangaList();
    const isSingleDelete = idsToDelete.length === 1;
    const mangaToDelete = isSingleDelete ? currentList.find((manga) => manga.id === idsToDelete[0]) : null;

    const title = `Delete ${isSingleDelete ? "Manga" : `${idsToDelete.length} Manga`}?`;
    const contentText =
        isSingleDelete && mangaToDelete
            ? `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`
            : `Are you sure you want to delete these ${idsToDelete.length} items? This cannot be undone.`;
    const contentElement = h("p", {}, contentText);

    confirmModal(DELETE_MANGA_MODAL_ID, {
        confirmText: "Delete",
        content: contentElement,
        onConfirm: () => {
            const updatedList = currentList.filter((manga) => !idsToDelete.includes(manga.id));
            const updatedSettings = { ...PersistState.mangaSettings };
            idsToDelete.forEach((id) => {
                delete updatedSettings[id];
            });

            updateMangaState(updatedList);
            PersistState.update("mangaSettings", updatedSettings);

            if (!isSingleDelete) {
                UIState.update("selectedMangaIds", []);
                UIState.update("isSelectModeEnabled", false);
            }

            hideModal(DELETE_MANGA_MODAL_ID);
        },
        title,
    });
}

export function loadMangaForViewing(manga: Manga): void {
    PersistState.update("currentMangaId", manga.id);
    const settings = getSettings(manga.id);
    if (PersistState.update("currentView", "viewer")) {
        showViewer();
    }
    void waitForNextPaint().then(() => {
        if (PersistState.currentView !== "viewer") {
            return;
        }
        loadChapterImages(settings.currentChapter ?? 0);
    });
}
