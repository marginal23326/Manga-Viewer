import { $, $$, h, removeClass } from "../core/dom-utils";
import { scrollToView, toInt } from "../core/utils";
import { iconSvg } from "../core/icons";

function createFormGroup(label, inputElement, helpText = null, tooltip = null) {
    const group = h("div", { className: "mb-6 relative" });

    const labelElement = h("label", {
        className:
            "flex items-center text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white mb-2",
        htmlFor: inputElement.id,
    });
    const arrow = h("span", { className: "text-accent mr-2" }, "►");
    const labelText = document.createTextNode(label);
    labelElement.append(arrow);
    labelElement.append(labelText);

    const inputContainer = h("div", { className: "relative flex" }, inputElement);

    if (tooltip) {
        const icon = iconSvg("HelpCircle", {
            className: "group-hover:text-white transition-colors",
            size: 20,
        });
        const tooltipWrapper = h(
            "div",
            {
                className:
                    "flex-shrink-0 w-12 border-y-2 border-r-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center cursor-help group transition-colors hover:bg-accent hover:border-accent",
                title: tooltip,
            },
            icon,
        );
        inputElement.style.borderRightWidth = "0";
        inputContainer.append(tooltipWrapper);
    }

    const helpElement = helpText
        ? h(
              "p",
              {
                  className:
                      "mt-2 text-[10px] sm:text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-accent pl-2",
              },
              `NOTE: ${helpText}`,
          )
        : null;

    group.append(labelElement);
    group.append(inputContainer);
    if (helpElement) group.append(helpElement);

    return group;
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

    // --- Form Fields ---

    // Title
    const titleInput = h("input", {
        className: inputClasses,
        id: "manga-title-input",
        name: "title",
        placeholder: "ENTER VOLUME DESIGNATION...",
        required: true,
        type: "text",
        value: initialData?.title || "",
    });
    form.append(createFormGroup("Title", titleInput));

    // Description
    const descInput = h("textarea", {
        className: inputClasses,
        id: "manga-description-input",
        name: "description",
        placeholder: "ENTER OPTIONAL METADATA...",
        rows: 3,
    });
    descInput.value = initialData?.description || "";
    form.append(createFormGroup("Description", descInput));

    // Images Full Path
    const pathInput = h("input", {
        className: inputClasses,
        id: "manga-path-input",
        name: "imagesFullPath",
        placeholder: "C:\\LIBRARY\\MANGA\\SERIES_01",
        required: true,
        type: "text",
        value: initialData?.imagesFullPath || "",
    });
    const pathTooltip = "Absolute path to the image directory. Subdirectories are restricted.";
    form.append(createFormGroup("Directory Path", pathInput, null, pathTooltip));

    // Form Row for Numbers (Grid Layout)
    const numberRow = h("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" });

    // Total Images
    const totalImagesInput = h("input", {
        className: numberInputClasses,
        id: "manga-total-images-input",
        min: 1,
        name: "totalImages",
        placeholder: "000",
        required: true,
        type: "number",
        value: initialData?.totalImages || "",
    });

    const totalImagesGroup = createFormGroup("Total Files", totalImagesInput, "Total image count across all chapters.");
    removeClass(totalImagesGroup, "mb-6");
    numberRow.append(totalImagesGroup);

    // Total Chapters
    const totalChaptersInput = h("input", {
        className: numberInputClasses,
        id: "manga-total-chapters-input",
        min: 1,
        name: "userProvidedTotalChapters",
        placeholder: "00",
        required: true,
        type: "number",
        value: initialData?.userProvidedTotalChapters || "",
    });

    const totalChaptersGroup = createFormGroup(
        "Total Chapters",
        totalChaptersInput,
        "Used for internal pagination calculations.",
    );
    removeClass(totalChaptersGroup, "mb-6");
    numberRow.append(totalChaptersGroup);

    form.append(numberRow);

    return form;
}

/**
 * Extracts form data from the manga form element.
 */
export function getMangaFormData(formElement) {
    if (!formElement) return null;
    const formData = new FormData(formElement);
    return {
        description: formData.get("description")?.trim() || "",
        imagesFullPath: formData.get("imagesFullPath")?.trim() || "",
        title: formData.get("title")?.trim() || "",
        totalImages: toInt(formData.get("totalImages"), 0),
        userProvidedTotalChapters: toInt(formData.get("userProvidedTotalChapters"), 0),
    };
}

/**
 * Validates the manga form, returning the first invalid input or null.
 * Adds/removes error classes on invalid fields.
 */
function validateMangaForm(formElement) {
    if (!formElement) return null;
    let firstInvalidInput = null;

    const errorClasses = ["!border-accent", "!shadow-[4px_4px_0_0_var(--color-accent)]", "dark:!border-accent"];

    // Check required fields and number validity
    $$("[required]", formElement).forEach((input) => {
        let isInputValid = true;
        if (!input.value.trim()) {
            isInputValid = false;
        }
        // Basic number validation
        if (input.type === "number") {
            const numericValue = toInt(input.value);
            if (Number.isNaN(numericValue) || numericValue < (input.min || 0)) {
                isInputValid = false;
            }
        }

        if (isInputValid) {
            errorClasses.forEach((cls) => input.classList.remove(cls));
        } else {
            errorClasses.forEach((cls) => input.classList.add(cls));
        }

        if (!isInputValid && !firstInvalidInput) {
            firstInvalidInput = input;
        }
    });
    return firstInvalidInput;
}

function focusAndScrollToInvalidInput(inputElement) {
    if (!inputElement) return;
    setTimeout(() => inputElement.focus(), 200);
    scrollToView(inputElement, "smooth", "center");
}

export function showFormError(errorElementId, invalidInput = null) {
    const errorElement = errorElementId ? $(`#${errorElementId}`) : null;
    if (!errorElement) return;

    if (invalidInput) {
        errorElement.textContent = "Fill in all required fields.";
        errorElement.classList.remove("hidden");
    } else {
        errorElement.classList.add("hidden");
    }
}

export function validateAndReport(formElement, errorElementId, { onInvalid } = {}) {
    const invalidInput = validateMangaForm(formElement);
    if (invalidInput) {
        onInvalid?.();
        focusAndScrollToInvalidInput(invalidInput);
        showFormError(errorElementId, invalidInput);
        return false;
    }

    showFormError(errorElementId);
    return true;
}
