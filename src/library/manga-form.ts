import type { Manga, MangaFormData } from "@/types";
import { createFormGroup, createNumberField } from "@/components/form-field";
import { h } from "@/core/dom-utils";
import { toInt } from "@/core/utils";

/**
 * Generates the HTML structure for the manga form.
 * @param initialData - Optional data to pre-fill the form (for editing).
 */
export function createMangaFormElement(initialData: Manga | null = null): HTMLFormElement {
    const form = h("form", { noValidate: true });

    const inputClasses = "input-field";

    // --- Form Fields ---

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

    // Images Full Path
    const pathInput = h("input", {
        className: inputClasses,
        id: "manga-path-input",
        name: "imagesFullPath",
        placeholder: "C:\\Library\\Manga\\Series_01",
        required: true,
        type: "text",
        value: initialData?.imagesFullPath ?? "",
    });
    const pathTooltip = "Absolute path to the image directory. Subdirectories are restricted.";
    form.append(createFormGroup("Directory path", pathInput, { tooltip: pathTooltip }));

    // Form Row for Numbers (Grid Layout)
    const numberRow = h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5" });

    // Total Images
    const totalImagesInput = createNumberField("manga-total-images-input", {
        min: 1,
        name: "totalImages",
        placeholder: "0",
        value: initialData?.totalImages ?? "",
    });
    numberRow.append(
        createFormGroup("Total files", totalImagesInput, {
            className: "relative",
            hint: "Total image count across all chapters.",
        }),
    );

    // Total Chapters
    const totalChaptersInput = createNumberField("manga-total-chapters-input", {
        min: 1,
        name: "totalChapters",
        placeholder: "0",
        value: initialData?.totalChapters ?? "",
    });
    numberRow.append(
        createFormGroup("Total chapters", totalChaptersInput, {
            className: "relative",
            hint: "Used for internal pagination calculations.",
        }),
    );

    form.append(numberRow);

    form.addEventListener("input", () => totalChaptersInput.setCustomValidity(""));

    return form;
}

/** Extracts form data from the manga form element. */
function getMangaFormData(formElement: HTMLFormElement): MangaFormData {
    const formData = new FormData(formElement);
    const getText = (name: string): string => (formData.get(name) as string | null)?.trim() ?? "";

    return {
        description: getText("description"),
        imagesFullPath: getText("imagesFullPath"),
        title: getText("title"),
        totalChapters: toInt(formData.get("totalChapters") as string | null),
        totalImages: toInt(formData.get("totalImages") as string | null),
    };
}

export function getValidatedMangaFormData(formElement: HTMLFormElement): MangaFormData | null {
    if (!formElement.checkValidity()) {
        formElement.reportValidity();
        return null;
    }
    const chaptersInput = formElement.querySelector<HTMLInputElement>("#manga-total-chapters-input");
    chaptersInput?.setCustomValidity("");
    const formData = getMangaFormData(formElement);
    if (formData.totalChapters > formData.totalImages) {
        chaptersInput?.setCustomValidity("Chapters cannot exceed total images.");
        formElement.reportValidity();
        return null;
    }
    return formData;
}
