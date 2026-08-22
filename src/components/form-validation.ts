import { $, $$, scrollToView, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { toInt } from "@/core/utils";

export function validateRequiredInputs(target: HTMLElement | HTMLInputElement[] | null): HTMLInputElement | null {
    if (target === null) return null;
    const inputs = Array.isArray(target) ? target : [...$$<HTMLInputElement>("[required]", target)];

    let firstInvalidInput: HTMLInputElement | null = null;
    for (const input of inputs) {
        let isValid = input.value.trim() !== "";
        if (isValid && input.type === "number") {
            const minValue = Number(input.min) || 0;
            isValid = toInt(input.value) >= minValue;
        }

        toggleClass(input, "input-error", !isValid);
        if (!isValid && !firstInvalidInput) {
            firstInvalidInput = input;
        }
    }
    return firstInvalidInput;
}

function focusInvalidInput(inputElement: HTMLInputElement): void {
    setTimeout(() => inputElement.focus(), 200);
    scrollToView(inputElement, "smooth", "center");
}

function showError(errorElementId: string): void {
    const errorElement = $(`#${errorElementId}`);
    if (!errorElement) return;

    setText(errorElement, "Fill in all required fields.");
    setVisible(errorElement, true);
}

export interface ValidateAndReportOptions {
    onInvalid?: () => void;
}

export function reportValidationResult(
    invalidInput: HTMLInputElement | null,
    errorElementId: string,
    onInvalid?: () => void,
): boolean {
    if (!invalidInput) return true;

    onInvalid?.();
    focusInvalidInput(invalidInput);
    showError(errorElementId);
    return false;
}

export function validateAndReport(
    formElement: HTMLFormElement | null,
    errorElementId: string,
    { onInvalid }: ValidateAndReportOptions = {},
): boolean {
    return reportValidationResult(validateRequiredInputs(formElement), errorElementId, onInvalid);
}
