import type { Binding } from "@/core/binding";
import { h } from "@/core/dom-utils";
import { toInt } from "@/core/utils";

export interface StepperOptions {
    className?: string;
    min?: number;
    signal?: AbortSignal;
    step?: number;
    unit?: string;
}

export function createStepper(
    binding: Binding<number>,
    { className = "", min = 0, signal, step = 1, unit = "" }: StepperOptions = {},
): HTMLDivElement {
    const input = h("input", {
        className: "w-11 grow text-center font-mono text-xs font-semibold bg-transparent outline-none input-no-spinner",
        min: String(min),
        onchange: () => apply(toInt(input.value)),
        required: true,
        type: "number",
    });

    const apply = (val: number) => {
        const next = Math.max(min, val);
        input.value = String(next);
        binding.set(next);
    };

    binding.subscribe((value) => {
        input.value = String(value);
    }, signal);

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

    return h(
        "div",
        { className: `inline-flex items-center h-8 rounded-xl surface select-none overflow-hidden ${className}` },
        createBtn("−", -step),
        input,
        unit ? h("span", { className: "text-[11px] font-mono text-muted pr-1.5 select-none" }, unit) : null,
        createBtn("+", step),
    );
}
