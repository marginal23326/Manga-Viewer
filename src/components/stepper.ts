import { h } from "@/core/dom-utils";
import { toInt } from "@/core/utils";

export function createStepper(
    value: number,
    onChange: (value: number) => void,
    { className = "", min = 0, step = 1, unit = "" } = {},
): { element: HTMLElement; setValue: (value: number) => void } {
    const input = h("input", {
        className:
            "w-11 grow text-center font-mono text-xs font-semibold text-ink dark:text-paper bg-transparent outline-none input-no-spinner",
        min: String(min),
        onchange: () => apply(toInt(input.value)),
        required: true,
        type: "number",
        value: String(value),
    });

    const apply = (val: number) => {
        const next = Math.max(min, val);
        input.value = String(next);
        onChange(next);
    };

    const createBtn = (label: string, delta: number) =>
        h(
            "button",
            {
                className:
                    "w-7 h-7 flex items-center justify-center text-muted hover:text-ink dark:hover:text-paper active:scale-95 font-mono select-none cursor-pointer",
                onclick: () => apply(toInt(input.value) + delta),
                onmousedown: (e: MouseEvent) => e.preventDefault(),
                type: "button",
            },
            label,
        );

    return {
        element: h(
            "div",
            { className: `inline-flex items-center h-8 rounded-xl surface select-none overflow-hidden ${className}` },
            createBtn("−", -step),
            input,
            unit ? h("span", { className: "text-[11px] font-mono text-muted pr-1.5 select-none" }, unit) : null,
            createBtn("+", step),
        ),
        setValue: (v: number) => {
            input.value = String(v);
        },
    };
}
