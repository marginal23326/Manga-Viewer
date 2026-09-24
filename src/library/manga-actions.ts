import { type MangaFormHandle, type MangaFormResult, createMangaFormElement } from "./manga-form";
import { PersistState, adoptMangaFolder, deleteMangas, getMangaList, setMangaList, updateManga } from "@/state";
import type { Manga } from "@/types";
import { createModal } from "@/components/modal";
import { h } from "@/core/dom-utils";
import { reloadManga } from "@/viewer/chapter";

async function addManga(data: MangaFormResult): Promise<void> {
    if (!data.folder) return;

    const id = crypto.randomUUID();
    await adoptMangaFolder(id, data.folder.handle);

    const newManga: Manga = {
        description: data.description,
        folderName: data.folder.handle.name,
        id,
        title: data.title,
        totalChapters: data.folder.chapterCount,
    };
    setMangaList([...getMangaList(), newManga]);
}

async function editManga(mangaId: string, data: MangaFormResult): Promise<void> {
    const updated = updateManga(mangaId, {
        description: data.description,
        title: data.title,
        ...(data.folder && { folderName: data.folder.handle.name, totalChapters: data.folder.chapterCount }),
    });
    if (!updated) {
        console.error("Manga not found for editing:", mangaId);
        return;
    }

    if (data.folder) await adoptMangaFolder(mangaId, data.folder.handle);

    if (PersistState.currentMangaId === mangaId && data.folder) {
        void reloadManga();
    }
}

export function saveMangaOrder(newOrderIds: string[]): void {
    const currentList = getMangaList();
    setMangaList(
        newOrderIds
            .map((id) => currentList.find((manga) => manga.id === id))
            .filter((manga): manga is Manga => manga !== undefined),
    );
}

const mangaModal = createModal();
const deleteMangaModal = createModal();

export function openMangaModal(mangaToEdit: Manga | null = null): void {
    mangaModal.show(() => {
        const mangaForm = createMangaFormElement(mangaToEdit);
        return {
            buttons: [
                { onClick: mangaModal.close, side: "left", text: "Cancel", type: "secondary" },
                {
                    onClick: () => handleMangaFormSubmit(mangaForm, mangaToEdit?.id),
                    text: mangaToEdit ? "Save changes" : "Add manga",
                    type: "primary",
                },
            ],
            closeOnBackdropClick: false,
            content: mangaForm.element,
            size: "lg",
            title: mangaToEdit ? "Edit manga details" : "Add manga",
        };
    });
}

function handleMangaFormSubmit(mangaForm: MangaFormHandle, editingId?: string): void {
    const data = mangaForm.getValidatedData();
    if (!data) return;

    void (editingId ? editManga(editingId, data) : addManga(data));
    mangaModal.close();
}

export function confirmAndDelete(idsToDelete: string[]): void {
    if (idsToDelete.length === 0) return;

    deleteMangaModal.show(() => {
        const isSingleDelete = idsToDelete.length === 1;
        const mangaToDelete = isSingleDelete ? getMangaList().find((manga) => manga.id === idsToDelete[0]) : null;

        const title = isSingleDelete ? "Delete manga?" : `Delete ${idsToDelete.length} manga?`;
        const contentText =
            isSingleDelete && mangaToDelete
                ? `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`
                : `Are you sure you want to delete these ${idsToDelete.length} items? This cannot be undone.`;

        return {
            buttons: [
                { onClick: deleteMangaModal.close, side: "left", text: "Cancel", type: "secondary" },
                {
                    onClick: () => {
                        deleteMangas(idsToDelete);
                        deleteMangaModal.close();
                    },
                    text: "Delete",
                    type: "danger",
                },
            ],
            content: h("p", {}, contentText),
            title,
        };
    });
}
