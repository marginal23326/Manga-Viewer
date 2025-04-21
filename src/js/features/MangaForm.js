import { setAttribute, addClass, toggleClass } from "../core/DOMUtils";

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
        addClass(group, "mb-4"); // Spacing

        const labelElement = document.createElement("label");
        addClass(labelElement, "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1");
        labelElement.htmlFor = inputElement.id;
        labelElement.textContent = label;

        // Input container for potential icons/tooltips
        const inputContainer = document.createElement("div");
        addClass(inputContainer, "relative"); // For positioning tooltips/icons

        inputContainer.appendChild(inputElement); // Add the actual input

        // Add tooltip icon if provided
        if (tooltip) {
            const tooltipIcon = document.createElement("span");
            addClass(tooltipIcon, "absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 cursor-help");
            setAttribute(tooltipIcon, "title", tooltip); // Basic tooltip
            const icon = document.createElement("i");
            setAttribute(icon, "data-lucide", "info");
            setAttribute(icon, "width", "16");
            setAttribute(icon, "height", "16");
            tooltipIcon.appendChild(icon);
            inputContainer.appendChild(tooltipIcon);
            // Note: Tooltip library might be needed for better tooltips
        }

        group.appendChild(labelElement);
        group.appendChild(inputContainer);

        // Add help text if provided
        if (helpText) {
            const helpElement = document.createElement("p");
            addClass(helpElement, "mt-1 text-xs text-gray-500 dark:text-gray-400");
            helpElement.textContent = helpText;
            group.appendChild(helpElement);
        }

        return group;
    };

    // Input field styles
    const inputClasses = "block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    const numberInputClasses = `${inputClasses} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`; // Hide number spinners

    // --- Form Fields ---

    // Title
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.id = "manga-title-input";
    titleInput.name = "title";
    addClass(titleInput, inputClasses);
    titleInput.required = true;
    titleInput.value = initialData?.title || "";
    form.appendChild(createFormGroup("Title", titleInput));

    // Description
    const descInput = document.createElement("textarea");
    descInput.id = "manga-description-input";
    descInput.name = "description";
    addClass(descInput, inputClasses);
    descInput.rows = 3;
    descInput.value = initialData?.description || "";
    form.appendChild(createFormGroup("Description (Optional)", descInput));

    // Images Full Path
    const pathInput = document.createElement("input");
    pathInput.type = "text";
    pathInput.id = "manga-path-input";
    pathInput.name = "imagesFullPath";
    addClass(pathInput, inputClasses);
    pathInput.placeholder = "e.g., C:\\Users\\You\\Manga\\MySeries";
    pathInput.required = true;
    pathInput.value = initialData?.imagesFullPath || "";
    const pathTooltip =
        "Enter the full path to the folder containing chapter images (e.g., 1.jpg, 2.jpg...). Subfolders are not supported.";
    form.appendChild(createFormGroup("Images Folder Path", pathInput, null, pathTooltip));

    // Total Images
    const totalImagesInput = document.createElement("input");
    totalImagesInput.type = "number";
    totalImagesInput.id = "manga-total-images-input";
    totalImagesInput.name = "totalImages";
    addClass(totalImagesInput, numberInputClasses);
    totalImagesInput.min = 1;
    totalImagesInput.required = true;
    totalImagesInput.value = initialData?.totalImages || "";
    form.appendChild(createFormGroup(
        "Total Images",
        totalImagesInput,
        "The total number of image files across all chapters."),
    );

    // Total Chapters (User Provided)
    const totalChaptersInput = document.createElement("input");
    totalChaptersInput.type = "number";
    totalChaptersInput.id = "manga-total-chapters-input";
    totalChaptersInput.name = "userProvidedTotalChapters";
    addClass(totalChaptersInput, numberInputClasses);
    totalChaptersInput.min = 1;
    totalChaptersInput.required = true;
    totalChaptersInput.value = initialData?.userProvidedTotalChapters || "";
    form.appendChild(createFormGroup(
        "Total Chapters",
        totalChaptersInput,
        "How many chapters does this series have? Used to calculate images per chapter."),
    );

    return form;
}

/**
 * Extracts form data from the manga form element.
 * @param {HTMLFormElement} formElement - The form element.
 * @returns {object|null} The form data object or null if form not found.
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
 * @param {HTMLFormElement} formElement
 * @returns {HTMLElement|null}
 */
export function validateMangaForm(formElement) {
    if (!formElement) return null;
    let firstInvalidInput = null;
    const errorClass = "border-red-500 dark:border-red-400";

    // Check required fields and number validity
    formElement.querySelectorAll("[required]").forEach((input) => {
        let isInputValid = true;
        if (!input.value.trim()) {
            isInputValid = false;
        }
        // Basic number validation
        if (input.type === "number" &&
            (isNaN(parseInt(input.value, 10)) || parseInt(input.value, 10) < (input.min || 0))
        ) {
            isInputValid = false;
        }
        toggleClass(input, errorClass, !isInputValid);

        if (!isInputValid && !firstInvalidInput) {
            firstInvalidInput = input;
        }
    });
    return firstInvalidInput;
}

export function focusAndScrollToInvalidInput(inputElement) {
    if (!inputElement) return;
    setTimeout(() => inputElement.focus(), 200);
    inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
}
