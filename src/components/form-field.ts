import { h } from "@/core/dom-utils";

export const FIELD_LABEL_TEXT_CLASSES = "field-label";

export function createFieldLabel(text: string, forId?: string): HTMLLabelElement {
    return h("label", { className: FIELD_LABEL_TEXT_CLASSES, ...(forId && { htmlFor: forId }) }, text);
}

export function createHint(text: string): HTMLParagraphElement {
    return h("p", { className: "hint-text" }, text);
}

export interface NumberFieldOptions {
    min?: number;
    name?: string;
    placeholder?: string;
    required?: boolean;
    step?: number;
    value?: string | number;
}

export function createNumberField(id: string, options: NumberFieldOptions = {}): HTMLInputElement {
    const { min, name, placeholder, required = true, step, value } = options;

    return h("input", {
        className: "input-field input-no-spinner w-28",
        id,
        min,
        name: name ?? id,
        placeholder,
        required,
        step,
        type: "number",
        value,
    });
}
