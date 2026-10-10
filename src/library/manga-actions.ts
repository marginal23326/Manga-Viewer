import { type MangaFormHandle, type MangaFormResult, createMangaFormElement } from "./manga-form";
import { PersistState, ViewerState, adoptMangaFolder, deleteMangas, getManga, updateManga } from "@/state";
import type { Manga } from "@/types";
import { createModal } from "@/components/modal";
import { h } from "@/core/dom-utils";
import { navigateTo } from "@/app/hash-route";
import { randomId } from "@/core/utils";

async function addManga(data: MangaFormResult): Promise<void> {
    if (!data.folder) return;

    const id = randomId();
    await adoptMangaFolder(id, data.folder.handle);

    const newManga: Manga = {
        description: data.description,
        folderName: data.folder.handle.name,
        id,
        title: data.title,
        totalChapters: data.folder.chapterCount,
    };
    PersistState.update("mangaList", [...PersistState.mangaList, newManga]);
}

async function editManga(mangaId: string, data: MangaFormResult): Promise<void> {
    if (data.folder) await adoptMangaFolder(mangaId, data.folder.handle);

    updateManga(mangaId, {
        description: data.description,
        title: data.title,
        ...(data.folder && { folderName: data.folder.handle.name, totalChapters: data.folder.chapterCount }),
    });
}

export function saveMangaOrder(newOrderIds: string[]): void {
    PersistState.update(
        "mangaList",
        newOrderIds.flatMap((id) => getManga(id) ?? []),
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
        const mangaToDelete = idsToDelete.length === 1 ? getManga(idsToDelete[0]) : null;

        const title = mangaToDelete ? "Delete manga?" : `Delete ${idsToDelete.length} manga?`;
        const contentText = mangaToDelete
            ? `Are you sure you want to delete "${mangaToDelete.title}"? This cannot be undone.`
            : `Are you sure you want to delete these ${idsToDelete.length} items? This cannot be undone.`;

        return {
            buttons: [
                { onClick: deleteMangaModal.close, side: "left", text: "Cancel", type: "secondary" },
                {
                    onClick: () => {
                        const openId = ViewerState.currentMangaId;
                        deleteMangas(idsToDelete);
                        if (openId !== null && idsToDelete.includes(openId)) navigateTo({ name: "library" });
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
