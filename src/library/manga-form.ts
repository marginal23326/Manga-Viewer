import type { Manga, MangaFormData } from "@/types";
import { createFieldLabel, createHint, createNumberField } from "@/components/form-field";
import { h, removeClass } from "@/core/dom-utils";
import { iconSvg } from "@/core/icons";
import { toInt } from "@/core/utils";

function createFormGroup(
    label: string,
    inputElement: HTMLElement,
    helpText: string | null = null,
    tooltip: string | null = null,
): HTMLDivElement {
    const group = h("div", { className: "mb-5 relative" });

    const labelElement = createFieldLabel(label, inputElement.id);

    const inputContainer = h("div", { className: "relative flex" }, inputElement);

    if (tooltip) {
        const icon = iconSvg("HelpCircle", {
            className:
                "text-ink/40 dark:text-paper/35 group-hover:text-ink dark:group-hover:text-paper transition-colors",
            size: 16,
            strokeWidth: 2,
        });
        const tooltipWrapper = h(
            "div",
            {
                className:
                    "flex-shrink-0 w-11 rounded-r-xl border border-l-0 border-line dark:border-line-dark flex items-center justify-center cursor-help group transition-colors hover:bg-ink/[0.03] dark:hover:bg-white/[0.05]",
                title: tooltip,
            },
            icon,
        );
        inputElement.style.borderTopRightRadius = "0";
        inputElement.style.borderBottomRightRadius = "0";
        inputContainer.append(tooltipWrapper);
    }

    const helpElement = helpText ? createHint(helpText) : null;

    group.append(labelElement, inputContainer);
    if (helpElement) group.append(helpElement);

    return group;
}

/**
 * Generates the HTML structure for the manga form.
 * @param initialData - Optional data to pre-fill the form (for editing).
 */
export function createMangaFormElement(initialData: Manga | null = null): HTMLFormElement {
    const form = h("form", { id: "manga-form", noValidate: true });

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
    form.append(createFormGroup("Directory path", pathInput, null, pathTooltip));

    // Form Row for Numbers (Grid Layout)
    const numberRow = h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-5" });

    // Total Images
    const totalImagesInput = createNumberField("manga-total-images-input", {
        min: 1,
        name: "totalImages",
        placeholder: "0",
        value: initialData?.totalImages ?? "",
    });

    const totalImagesGroup = createFormGroup("Total files", totalImagesInput, "Total image count across all chapters.");
    removeClass(totalImagesGroup, "mb-5");
    numberRow.append(totalImagesGroup);

    // Total Chapters
    const totalChaptersInput = createNumberField("manga-total-chapters-input", {
        min: 1,
        name: "userProvidedTotalChapters",
        placeholder: "0",
        value: initialData?.userProvidedTotalChapters ?? "",
    });

    const totalChaptersGroup = createFormGroup(
        "Total chapters",
        totalChaptersInput,
        "Used for internal pagination calculations.",
    );
    removeClass(totalChaptersGroup, "mb-5");
    numberRow.append(totalChaptersGroup);

    form.append(numberRow);

    return form;
}

/** Extracts form data from the manga form element. */
export function getMangaFormData(formElement: HTMLFormElement | null): MangaFormData | null {
    if (!formElement) return null;

    const formData = new FormData(formElement);
    const getText = (name: string): string => (formData.get(name) as string | null)?.trim() ?? "";

    return {
        description: getText("description"),
        imagesFullPath: getText("imagesFullPath"),
        title: getText("title"),
        totalImages: toInt(formData.get("totalImages"), 0),
        userProvidedTotalChapters: toInt(formData.get("userProvidedTotalChapters"), 0),
    };
}
