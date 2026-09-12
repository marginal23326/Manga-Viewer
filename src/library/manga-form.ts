import { createFormGroup, createHint, createNumberField } from "@/components/form-field";
import { h, setText, setVisible } from "@/core/dom-utils";
import { pickMangaFolder, scanMangaFolder } from "@/state";
import type { Manga } from "@/types";
import { toInt } from "@/core/utils";

interface FolderSelection {
    handle: FileSystemDirectoryHandle;
    imageCount: number;
}

export interface MangaFormResult {
    description: string;
    folder?: FolderSelection;
    title: string;
    totalChapters: number;
}

export interface MangaFormHandle {
    readonly element: HTMLFormElement;
    getValidatedData: () => MangaFormResult | null;
}

function pluralize(count: number, noun: string): string {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function createMangaFormElement(initialData: Manga | null = null): MangaFormHandle {
    const form = h("form", { noValidate: true });
    const inputClasses = "input-field";

    // Title
    const titleInput = h("input", {
        className: inputClasses,
        id: "manga-title-input",
        name: "title",
        placeholder: "One Piece",
        required: true,
        type: "text",
        value: initialData?.title ?? "",
    });
    form.append(createFormGroup("Title", titleInput));

    // Description
    const descInput = h("textarea", {
        className: inputClasses,
        id: "manga-description-input",
        name: "description",
        placeholder: "A short description (optional)",
        rows: 3,
    });
    descInput.value = initialData?.description ?? "";
    form.append(createFormGroup("Description", descInput));

    let pickedFolder: FolderSelection | null = null;

    const folderNameDisplay = h(
        "span",
        { className: "input-field flex-1 flex items-center text-sm truncate" },
        initialData?.folderName ?? "No folder selected",
    );
    const chooseFolderBtn = h(
        "button",
        { className: "btn-secondary shrink-0", type: "button" },
        initialData ? "Change…" : "Choose…",
    );
    const folderRow = h("div", { className: "flex items-center gap-3" }, folderNameDisplay, chooseFolderBtn);

    const folderGroup = createFormGroup("Folder", folderRow);
    const folderStatus = createHint(
        initialData
            ? `${pluralize(initialData.totalImages, "image")} found`
            : "Choose the folder containing this series' images.",
    );
    const folderError = h(
        "p",
        { className: "hint-text text-accent dark:text-accent-light" },
        "Please choose a folder to continue.",
    );
    setVisible(folderError, false);
    folderGroup.append(folderStatus, folderError);
    form.append(folderGroup);

    // Total Chapters
    const totalChaptersInput = createNumberField("manga-total-chapters-input", {
        min: 1,
        name: "totalChapters",
        placeholder: "0",
        value: initialData?.totalChapters ?? "",
    });
    form.append(
        createFormGroup("Total chapters", totalChaptersInput, {
            hint: "Used for internal pagination calculations.",
        }),
    );

    chooseFolderBtn.addEventListener("click", () => {
        void (async (): Promise<void> => {
            const handle = await pickMangaFolder();
            if (!handle) return;

            chooseFolderBtn.disabled = true;
            setText(chooseFolderBtn, "Scanning…");

            const files = await scanMangaFolder(handle);
            pickedFolder = { handle, imageCount: files.length };

            setText(folderNameDisplay, handle.name);
            setText(folderStatus, `${pluralize(files.length, "image")} found`);
            setVisible(folderError, false);
            totalChaptersInput.setCustomValidity("");

            chooseFolderBtn.disabled = false;
            setText(chooseFolderBtn, "Change…");
        })();
    });

    form.addEventListener("input", () => totalChaptersInput.setCustomValidity(""));

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

            const formData = new FormData(form);
            const totalChapters = toInt(formData.get("totalChapters") as string | null);
            const effectiveImageCount = pickedFolder?.imageCount ?? initialData?.totalImages ?? 0;

            totalChaptersInput.setCustomValidity("");
            if (totalChapters > effectiveImageCount) {
                totalChaptersInput.setCustomValidity("Chapters cannot exceed total images.");
                form.reportValidity();
                return null;
            }

            const getText = (name: string): string => (formData.get(name) as string | null)?.trim() ?? "";
            return {
                description: getText("description"),
                folder: pickedFolder ?? undefined,
                title: getText("title"),
                totalChapters,
            };
        },
    };
}
