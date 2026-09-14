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

function row(label: string, control: HTMLElement, isMultiLine = false): HTMLDivElement {
    return h(
        "div",
        { className: `flex ${isMultiLine ? "items-start" : "items-center"} py-2.5 px-4 gap-4` },
        h(
            "span",
            {
                className: `w-20 text-[13px] font-medium text-secondary shrink-0 select-none ${isMultiLine ? "pt-0.5" : ""}`,
            },
            label,
        ),
        control,
    );
}

export function createMangaFormElement(initialData: Manga | null = null): MangaFormHandle {
    const form = h("form", { noValidate: true });
    let pickedFolder: FolderSelection | null = null;
    let isTitleCustomized = Boolean(initialData?.title?.trim());

    const inputClass =
        "flex-1 bg-transparent text-[13px] text-ink dark:text-paper placeholder:text-ink/35 dark:placeholder:text-paper/30 outline-none";

    const titleInput = h("input", {
        className: `${inputClass} font-medium`,
        name: "title",
        oninput: () => {
            isTitleCustomized = titleInput.value.trim().length > 0;
        },
        placeholder: "One Piece",
        required: true,
        type: "text",
        value: initialData?.title ?? "",
    });

    const descInput = h(
        "textarea",
        {
            className: `${inputClass} resize-none py-0.5 leading-relaxed`,
            name: "description",
            placeholder: "A short description (optional)",
            rows: 2,
        },
        initialData?.description ?? "",
    );

    const folderName = h(
        "span",
        { className: "text-[13px] truncate" },
        initialData?.folderName ?? "No folder selected",
    );
    const chapterChip = h(
        "span",
        { className: "chip text-[11px] font-mono shrink-0", hidden: !initialData },
        initialData ? pluralize(initialData.totalChapters, "chapter") : "",
    );
    const folderError = h(
        "span",
        { className: "text-xs text-accent font-medium shrink-0", hidden: true },
        "Folder required",
    );
    const chooseFolderBtn = h(
        "button",
        {
            className: "btn-secondary btn-sm shrink-0 ml-auto",
            onclick: () => void pickFolder(),
            type: "button",
        },
        initialData ? "Change…" : "Choose…",
    );

    const folderContent = h(
        "div",
        { className: "flex items-center gap-2.5 flex-1 min-w-0" },
        folderName,
        chapterChip,
        folderError,
        chooseFolderBtn,
    );

    form.append(
        h(
            "div",
            { className: "setting-card" },
            row("Title", titleInput),
            row("Description", descInput, true),
            row("Folder", folderContent),
        ),
    );

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
        setText(chooseFolderBtn, "Change…");
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
