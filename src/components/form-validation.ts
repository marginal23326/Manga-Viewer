import { $, $$, scrollToView, setText, toggleClass } from "@/core/dom-utils";
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

export function focusAndScrollToInvalidInput(inputElement: HTMLInputElement | null): void {
    if (!inputElement) return;
    setTimeout(() => inputElement.focus(), 200);
    scrollToView(inputElement, "smooth", "center");
}

export function showFormError(errorElementId: string, invalidInput: HTMLInputElement | null = null): void {
    const errorElement = errorElementId ? $(`#${errorElementId}`) : null;
    if (!errorElement) return;

    if (invalidInput) setText(errorElement, "Fill in all required fields.");
    toggleClass(errorElement, "hidden", !invalidInput);
}

export interface ValidateAndReportOptions {
    onInvalid?: () => void;
}

export function reportValidationResult(
    invalidInput: HTMLInputElement | null,
    errorElementId: string,
    onInvalid?: () => void,
): boolean {
    if (invalidInput) {
        onInvalid?.();
        focusAndScrollToInvalidInput(invalidInput);
        showFormError(errorElementId, invalidInput);
        return false;
    }

    showFormError(errorElementId);
    return true;
}

export function validateAndReport(
    formElement: HTMLFormElement | null,
    errorElementId: string,
    { onInvalid }: ValidateAndReportOptions = {},
): boolean {
    return reportValidationResult(validateRequiredInputs(formElement), errorElementId, onInvalid);
}
