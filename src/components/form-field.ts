import { h } from "@/core/dom-utils";

export const FIELD_LABEL_TEXT_CLASSES = "text-sm text-label text-black dark:text-white mb-2";

export function createFieldLabel(text: string, forId?: string): HTMLLabelElement {
    return h("label", { className: `block ${FIELD_LABEL_TEXT_CLASSES}`, ...(forId && { htmlFor: forId }) }, text);
}

export function createHint(text: string): HTMLParagraphElement {
    return h("p", { className: "hint-text" }, text);
}
