import { setAttribute, addClass } from "../core/DOMUtils";
import { scrollToView } from "../core/Utils";

/**
 * Generates the HTML structure for the manga form.
 * @param {object|null} [initialData=null] - Optional data to pre-fill the form (for editing).
 * @returns {HTMLElement} - The form element.
 */
export function createMangaFormElement(initialData = null) {
    const form = document.createElement("form");
    form.id = "manga-form";
    form.noValidate = true; // Prevent default browser validation, handle in JS

    // Helper to create form groups
    const createFormGroup = (label, inputElement, helpText = null, tooltip = null) => {
        const group = document.createElement("div");
        addClass(group, "mb-6 relative"); // Increased spacing for heavy borders

        const labelElement = document.createElement("label");
        addClass(
            labelElement,
            "flex items-center text-sm font-space font-bold uppercase tracking-widest text-black dark:text-white mb-2",
        );
        labelElement.htmlFor = inputElement.id;

        // Terminal-style accent arrow
        const arrow = document.createElement("span");
        addClass(arrow, "text-[#FF3366] mr-2");
        arrow.textContent = "►";

        const labelText = document.createTextNode(label);
        labelElement.appendChild(arrow);
        labelElement.appendChild(labelText);

        // Input container for potential icons/tooltips
        const inputContainer = document.createElement("div");
        addClass(inputContainer, "relative flex");

        inputContainer.appendChild(inputElement);

        // Add tooltip icon if provided
        if (tooltip) {
            const tooltipWrapper = document.createElement("div");
            // Tooltip block attached to the right side of the input
            addClass(
                tooltipWrapper,
                "flex-shrink-0 w-12 border-y-2 border-r-2 border-black dark:border-white bg-black dark:bg-white text-white dark:text-black flex items-center justify-center cursor-help group transition-colors hover:bg-[#FF3366] hover:border-[#FF3366]",
            );
            setAttribute(tooltipWrapper, { title: tooltip });

            const icon = document.createElement("i");
            setAttribute(icon, { "data-lucide": "help-circle", width: "20", height: "20", "stroke-width": "3" });
            addClass(icon, "group-hover:text-white transition-colors");

            tooltipWrapper.appendChild(icon);
            inputContainer.appendChild(tooltipWrapper);

            // Adjust input border so it merges cleanly with the tooltip block
            inputElement.style.borderRightWidth = "0";
        }

        group.appendChild(labelElement);
        group.appendChild(inputContainer);

        // Add help text if provided
        if (helpText) {
            const helpElement = document.createElement("p");
            addClass(
                helpElement,
                "mt-2 text-[10px] sm:text-xs font-space font-bold uppercase tracking-widest text-black/50 dark:text-white/50 border-l-2 border-[#FF3366] pl-2",
            );
            helpElement.textContent = `NOTE: ${helpText}`;
            group.appendChild(helpElement);
        }

        return group;
    };

    // Input field styles
    const inputClasses =
        "block w-full px-4 py-3 border-2 border-black dark:border-white rounded-none bg-[#f4f4f0] dark:bg-[#0a0a0a] text-black dark:text-white font-space font-bold placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:uppercase focus:outline-none focus:ring-0 focus:border-[#FF3366] dark:focus:border-[#FF3366] focus:shadow-[4px_4px_0_0_#FF3366] transition-all duration-150";

    const numberInputClasses = `${inputClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

    // --- Form Fields ---

    // Title
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.id = "manga-title-input";
    titleInput.name = "title";
    addClass(titleInput, inputClasses);
    titleInput.placeholder = "ENTER VOLUME DESIGNATION...";
    titleInput.required = true;
    titleInput.value = initialData?.title || "";
    form.appendChild(createFormGroup("Title", titleInput));

    // Description
    const descInput = document.createElement("textarea");
    descInput.id = "manga-description-input";
    descInput.name = "description";
    addClass(descInput, inputClasses);
    descInput.rows = 3;
    descInput.placeholder = "ENTER OPTIONAL METADATA...";
    descInput.value = initialData?.description || "";
    form.appendChild(createFormGroup("Description", descInput, "Optional contextual data for this entry."));

    // Images Full Path
    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.id = "manga-path-input";
    pathInput.name = "imagesFullPath";
    addClass(pathInput, inputClasses);
    pathInput.placeholder = "C:\\ARCHIVE\\MANGA\\SERIES_01";
    pathInput.required = true;
    pathInput.value = initialData?.imagesFullPath || "";
    const pathTooltip = "Absolute path to the image directory. Subdirectories are restricted.";
    form.appendChild(createFormGroup("Directory Path", pathInput, null, pathTooltip));

    // Form Row for Numbers (Grid Layout)
    const numberRow = document.createElement("div");
    addClass(numberRow, "grid grid-cols-1 md:grid-cols-2 gap-6");

    // Total Images
    const totalImagesInput = document.createElement("input");
    totalImagesInput.type = "number";
    totalImagesInput.id = "manga-total-images-input";
    totalImagesInput.name = "totalImages";
    addClass(totalImagesInput, numberInputClasses);
    totalImagesInput.min = 1;
    totalImagesInput.required = true;
    totalImagesInput.placeholder = "000";
    totalImagesInput.value = initialData?.totalImages || "";

    const totalImagesGroup = createFormGroup("Total Files", totalImagesInput, "Total image count across all chapters.");
    removeClass(totalImagesGroup, "mb-6"); // Strip default margin for grid layout
    numberRow.appendChild(totalImagesGroup);

    // Total Chapters
    const totalChaptersInput = document.createElement("input");
    totalChaptersInput.type = "number";
    totalChaptersInput.id = "manga-total-chapters-input";
    totalChaptersInput.name = "userProvidedTotalChapters";
    addClass(totalChaptersInput, numberInputClasses);
    totalChaptersInput.min = 1;
    totalChaptersInput.required = true;
    totalChaptersInput.placeholder = "00";
    totalChaptersInput.value = initialData?.userProvidedTotalChapters || "";

    const totalChaptersGroup = createFormGroup(
        "Total Chapters",
        totalChaptersInput,
        "Used for internal pagination calculations.",
    );
    removeClass(totalChaptersGroup, "mb-6"); // Strip default margin for grid layout
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

// Helper to remove class if it exists (since removeClass isn't exported in the top block)
function removeClass(element, className) {
    if (element && className) {
        element.classList.remove(...className.split(" ").filter(Boolean));
    }
}
