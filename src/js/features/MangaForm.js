import { h } from "../core/DOMUtils";
import { scrollToView } from "../core/Utils";

function removeClass(element, className) {
    if (element && className) {
        element.classList.remove(...className.split(" ").filter(Boolean));
    }
}

/**
 * Generates the HTML structure for the manga form.
 * @param {object|null} [initialData=null] - Optional data to pre-fill the form (for editing).
 * @returns {HTMLElement} - The form element.
 */
export function createMangaFormElement(initialData = null) {
    const form = h("form", { id: "manga-form", noValidate: true });

    const inputClasses =
        "block w-full px-4 py-3 brutal-border rounded-none bg-paper dark:bg-ink text-black dark:text-white font-space font-bold placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:uppercase brutal-input-focus transition-all duration-150";

    const numberInputClasses = `${inputClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    const createFormGroup = (label, inputElement, helpText = null, tooltip = null) => {
        const group = h("div", { className: "mb-6 relative" });

        const labelElement = h("label", {
            htmlFor: inputElement.id,
            className:
                "flex items-center text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white mb-2",
        });
        const arrow = h("span", { className: "text-[#FF3366] mr-2" }, "►");
        const labelText = document.createTextNode(label);
        labelElement.appendChild(arrow);
        labelElement.appendChild(labelText);

        const inputContainer = h("div", { className: "relative flex" }, inputElement);

        if (tooltip) {
            const icon = h("i", {
                "data-lucide": "help-circle",
                width: "20",
                height: "20",
                "stroke-width": "3",
                className: "group-hover:text-white transition-colors",
            });
            const tooltipWrapper = h(
                "div",
                {
                    title: tooltip,
                    className:
                        "flex-shrink-0 w-12 border-y-2 border-r-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center cursor-help group transition-colors hover:bg-[#FF3366] hover:border-[#FF3366]",
                },
                icon,
            );
            inputElement.style.borderRightWidth = "0";
            inputContainer.appendChild(tooltipWrapper);
        }

        const helpElement = helpText
            ? h(
                  "p",
                  {
                      className:
                          "mt-2 text-[10px] sm:text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-[#FF3366] pl-2",
                  },
                  `NOTE: ${helpText}`,
              )
            : null;

        group.appendChild(labelElement);
        group.appendChild(inputContainer);
        if (helpElement) group.appendChild(helpElement);

        return group;
    };

    // --- Form Fields ---

    // Title
    const titleInput = h("input", {
        type: "text",
        id: "manga-title-input",
        name: "title",
        className: inputClasses,
        placeholder: "ENTER VOLUME DESIGNATION...",
        required: true,
        value: initialData?.title || "",
    });
    form.appendChild(createFormGroup("Title", titleInput));

    // Description
    const descInput = h("textarea", {
        id: "manga-description-input",
        name: "description",
        className: inputClasses,
        rows: 3,
        placeholder: "ENTER OPTIONAL METADATA...",
    });
    descInput.value = initialData?.description || "";
    form.appendChild(createFormGroup("Description", descInput));

    // Images Full Path
    const pathInput = h("input", {
        type: "text",
        id: "manga-path-input",
        name: "imagesFullPath",
        className: inputClasses,
        placeholder: "C:\\ARCHIVE\\MANGA\\SERIES_01",
        required: true,
        value: initialData?.imagesFullPath || "",
    });
    const pathTooltip = "Absolute path to the image directory. Subdirectories are restricted.";
    form.appendChild(createFormGroup("Directory Path", pathInput, null, pathTooltip));

    // Form Row for Numbers (Grid Layout)
    const numberRow = h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" });

    // Total Images
    const totalImagesInput = h("input", {
        type: "number",
        id: "manga-total-images-input",
        name: "totalImages",
        className: numberInputClasses,
        min: 1,
        required: true,
        placeholder: "000",
        value: initialData?.totalImages || "",
    });

    const totalImagesGroup = createFormGroup("Total Files", totalImagesInput, "Total image count across all chapters.");
    removeClass(totalImagesGroup, "mb-6");
    numberRow.appendChild(totalImagesGroup);

    // Total Chapters
    const totalChaptersInput = h("input", {
        type: "number",
        id: "manga-total-chapters-input",
        name: "userProvidedTotalChapters",
        className: numberInputClasses,
        min: 1,
        required: true,
        placeholder: "00",
        value: initialData?.userProvidedTotalChapters || "",
    });

    const totalChaptersGroup = createFormGroup(
        "Total Chapters",
        totalChaptersInput,
        "Used for internal pagination calculations.",
    );
    removeClass(totalChaptersGroup, "mb-6");
    numberRow.appendChild(totalChaptersGroup);

    form.appendChild(numberRow);

    return form;
}

/**
 * Extracts form data from the manga form element.
 */
export function getMangaFormData(formElement) {
    if (!formElement) return null;
    const formData = new FormData(formElement);
    return {
        title: formData.get("title")?.trim() || "",
        description: formData.get("description")?.trim() || "",
        imagesFullPath: formData.get("imagesFullPath")?.trim() || "",
        totalImages: parseInt(formData.get("totalImages"), 10) || 0,
        userProvidedTotalChapters: parseInt(formData.get("userProvidedTotalChapters"), 10) || 0,
    };
}

/**
 * Validates the manga form, returning the first invalid input or null.
 * Adds/removes error classes on invalid fields.
 */
export function validateMangaForm(formElement) {
    if (!formElement) return null;
    let firstInvalidInput = null;

    const errorClasses = ["!border-[#FF3366]", "!shadow-[4px_4px_0_0_#FF3366]", "dark:!border-[#FF3366]"];

    // Check required fields and number validity
    formElement.querySelectorAll("[required]").forEach((input) => {
        let isInputValid = true;
        if (!input.value.trim()) {
            isInputValid = false;
        }
        // Basic number validation
        if (
            input.type === "number" &&
            (isNaN(parseInt(input.value, 10)) || parseInt(input.value, 10) < (input.min || 0))
        ) {
            isInputValid = false;
        }

        if (!isInputValid) {
            errorClasses.forEach((cls) => input.classList.add(cls));
        } else {
            errorClasses.forEach((cls) => input.classList.remove(cls));
        }

        if (!isInputValid && !firstInvalidInput) {
            firstInvalidInput = input;
        }
    });
    return firstInvalidInput;
}

export function focusAndScrollToInvalidInput(inputElement) {
    if (!inputElement) return;
    setTimeout(() => inputElement.focus(), 200);
    scrollToView(inputElement, "smooth", "center");
}
