import { h, setText, setVisible } from "@/core/dom-utils";
import { pickMangaFolder, scanChapterFolders } from "@/state";
import type { Manga } from "@/types";

interface FolderSelection {
    chapterCount: number;
    handle: FileSystemDirectoryHandle;
}

export interface MangaFormResult {
    description: string;
    folder?: FolderSelection;
    title: string;
}

export interface MangaFormHandle {
    readonly element: HTMLFormElement;
    getValidatedData: () => MangaFormResult | null;
}

function pluralize(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function field(label: string, control: HTMLElement): HTMLElement {
    return h("div", { className: "flex flex-col gap-1.5" }, h("span", { className: "field-label" }, label), control);
}

export function createMangaFormElement(initialData: Manga | null = null): MangaFormHandle {
    const form = h("form", { noValidate: true });
    let pickedFolder: FolderSelection | null = null;
    let isTitleCustomized = Boolean(initialData?.title?.trim());

    const titleInput = h("input", {
        className: "input-field",
        name: "title",
        oninput: () => {
            isTitleCustomized = titleInput.value.trim().length > 0;
        },
        placeholder: "One Piece",
        required: true,
        type: "text",
        value: initialData?.title ?? "",
    });

    const descInput = h("input", {
        className: "input-field",
        name: "description",
        placeholder: "Optional",
        type: "text",
        value: initialData?.description ?? "",
    });

    const folderName = h(
        "span",
        { className: "text-[14px] truncate min-w-0" },
        initialData?.folderName ?? "No folder selected",
    );
    const chapterChip = h(
        "span",
        { className: "chip shrink-0", hidden: !initialData },
        initialData ? pluralize(initialData.totalChapters, "chapter") : "",
    );
    const folderError = h(
        "span",
        { className: "text-xs text-danger font-medium shrink-0", hidden: true },
        "Folder required",
    );
    const chooseFolderBtn = h(
        "button",
        {
            className: "btn-secondary btn-sm shrink-0 ml-auto h-8!",
            onclick: () => void pickFolder(),
            type: "button",
        },
        initialData ? "Change folder" : "Choose folder",
    );

    const folderContent = h(
        "div",
        { className: "surface rounded-[10px] flex items-center gap-2.5 min-w-0 h-10 pl-3.5 pr-1" },
        folderName,
        chapterChip,
        folderError,
        chooseFolderBtn,
    );

    form.className = "flex flex-col gap-4";
    form.append(field("Title", titleInput), field("Description", descInput), field("Folder", folderContent));

    async function pickFolder(): Promise<void> {
        const handle = await pickMangaFolder();
        if (!handle) return;

        chooseFolderBtn.disabled = true;
        setText(chooseFolderBtn, "Scanning…");

        const chapters = await scanChapterFolders(handle);
        pickedFolder = { chapterCount: chapters.length, handle };

        if (!isTitleCustomized) titleInput.value = handle.name.trim();

        setText(folderName, handle.name);
        setText(chapterChip, pluralize(chapters.length, "chapter"));
        setVisible(chapterChip, true);
        setVisible(folderError, false);

        chooseFolderBtn.disabled = false;
        setText(chooseFolderBtn, "Change folder");
    }

    return {
        element: form,
        getValidatedData: (): MangaFormResult | null => {
            if (!form.checkValidity()) {
                form.reportValidity();
                return null;
            }
            if (!initialData && !pickedFolder) {
                setVisible(folderError, true);
                return null;
            }
            const data = new FormData(form);
            const get = (name: string) => ((data.get(name) as string | null) ?? "").trim();
            return {
                description: get("description"),
                folder: pickedFolder ?? undefined,
                title: get("title"),
            };
        },
    };
}
