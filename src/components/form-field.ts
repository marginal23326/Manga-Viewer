import { h } from "@/core/dom-utils";
import { iconSvg } from "@/core/icons";

const FIELD_LABEL_TEXT_CLASSES = "field-label";

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

export interface FormGroupOptions {
    className?: string;
    hint?: string;
    id?: string;
    tooltip?: string;
}

function createTooltipBadge(tooltip: string): HTMLDivElement {
    return h(
        "div",
        {
            className:
                "flex-shrink-0 w-11 rounded-r-xl border border-l-0 border-line dark:border-line-dark flex items-center justify-center cursor-help group transition-colors hover:bg-ink/[0.03] dark:hover:bg-white/[0.05]",
            title: tooltip,
        },
        iconSvg("HelpCircle", {
            className:
                "text-ink/40 dark:text-paper/35 group-hover:text-ink dark:group-hover:text-paper transition-colors",
            size: 16,
        }),
    );
}

export function createFormGroup(
    label: string,
    control: HTMLElement,
    { className = "mb-5 relative", hint, id, tooltip }: FormGroupOptions = {},
): HTMLDivElement {
    const group = h("div", { className, ...(id && { id }) });
    group.append(createFieldLabel(label, control.id));

    if (tooltip) {
        const controlRow = h("div", { className: "relative flex" }, control);
        controlRow.append(createTooltipBadge(tooltip));
        control.style.borderTopRightRadius = "0";
        control.style.borderBottomRightRadius = "0";
        group.append(controlRow);
    } else {
        group.append(control);
    }

    if (hint) group.append(createHint(hint));
    return group;
}
