import { type MangaFormHandle, type MangaFormResult, createMangaFormElement } from "./manga-form";
import { type ModalButtonConfig, confirmModal, hideModal, showModal } from "@/components/modal";
import {
    PersistState,
    UIState,
    adoptMangaFolder,
    forgetMangaFolders,
    getMangaList,
    pruneMangaRecords,
    updateManga,
} from "@/state";
import type { Manga } from "@/types";
import { h } from "@/core/dom-utils";
import { reloadCurrentChapter } from "@/viewer/chapter";

function updateMangaState(list: Manga[]): void {
    PersistState.update("mangaList", list);
}

async function addManga(data: MangaFormResult): Promise<void> {
    if (!data.folder) {
        console.error("Cannot add manga without a folder.");
        return;
    }

    const id = crypto.randomUUID();
    await adoptMangaFolder(id, data.folder.handle);

    const newManga: Manga = {
        description: data.description,
        folderName: data.folder.handle.name,
        id,
        title: data.title,
        totalChapters: data.totalChapters,
        totalImages: data.folder.imageCount,
    };
    updateMangaState([...getMangaList(), newManga]);
}

export async function editManga(mangaId: string, data: MangaFormResult): Promise<void> {
    if (!getMangaList().some((manga) => manga.id === mangaId)) {
        console.error("Manga not found for editing:", mangaId);
        return;
    }

    if (data.folder) await adoptMangaFolder(mangaId, data.folder.handle);

    updateManga(mangaId, {
        description: data.description,
        title: data.title,
        totalChapters: data.totalChapters,
        ...(data.folder && { folderName: data.folder.handle.name, totalImages: data.folder.imageCount }),
    });

    if (PersistState.currentMangaId === mangaId) {
        reloadCurrentChapter();
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
    const mangaForm = createMangaFormElement(mangaToEdit);

    const modalButtons: ModalButtonConfig[] = [
        {
            onClick: () => hideModal(MANGA_MODAL_ID),
            side: "left",
            text: "Cancel",
            type: "secondary",
        },
        {
            id: "save-manga-btn",
            onClick: () => handleMangaFormSubmit(mangaForm, mangaToEdit?.id),
            text: mangaToEdit ? "Save changes" : "Add manga",
            type: "primary",
        },
    ];

    showModal(MANGA_MODAL_ID, {
        buttons: modalButtons,
        closeOnBackdropClick: false,
        content: mangaForm.element,
        size: "lg",
        title: mangaToEdit ? "Edit manga details" : "Add manga",
    });
}

function handleMangaFormSubmit(mangaForm: MangaFormHandle, editingId?: string): void {
    const data = mangaForm.getValidatedData();
    if (!data) return;

    void (editingId ? editManga(editingId, data) : addManga(data));
    hideModal(MANGA_MODAL_ID);
}

export function confirmAndDelete(idsToDelete: string[]): void {
    if (idsToDelete.length === 0) return;

    const currentList = getMangaList();
    const isSingleDelete = idsToDelete.length === 1;
    const mangaToDelete = isSingleDelete ? currentList.find((manga) => manga.id === idsToDelete[0]) : null;

    const title = isSingleDelete ? "Delete manga?" : `Delete ${idsToDelete.length} manga?`;
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

            updateMangaState(updatedList);
            pruneMangaRecords(idsToDelete);
            void forgetMangaFolders(idsToDelete);
            UIState.update("selection", { isSelectEnabled: false, selectedMangaIds: [] });

            hideModal(DELETE_MANGA_MODAL_ID);
        },
        title,
    });
}
