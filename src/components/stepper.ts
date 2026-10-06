import { clamp, toInt } from "@/core/utils";
import type { Binding } from "@/core/binding";
import { h } from "@/core/dom-utils";
import { iconSvg } from "@/core/icons";

export interface StepperOptions {
    className?: string;
    max?: number;
    min?: number;
    signal?: AbortSignal;
    step?: number;
    unit?: string;
}

export function createStepper(
    binding: Binding<number>,
    { className = "", max = Infinity, min = 0, signal, step = 1, unit = "" }: StepperOptions = {},
): HTMLDivElement {
    const input = h("input", {
        className: "w-11 grow text-center text-[13px] font-medium bg-transparent outline-none input-no-spinner",
        min: String(min),
        onchange: () => apply(toInt(input.value)),
        required: true,
        type: "number",
    });

    const apply = (val: number) => {
        const next = clamp(val, min, max);
        input.value = String(next);
        binding.set(next);
    };

    binding.subscribe((value) => {
        input.value = String(value);
    }, signal);

    const createBtn = (label: "minus" | "plus", delta: number) =>
        h(
            "button",
            {
                className:
                    "w-8 h-8 flex items-center justify-center text-muted hover:text-fg hover:bg-fg/6 active:scale-95 select-none cursor-pointer calm-transition",
                onclick: () => apply(toInt(input.value) + delta),
                onmousedown: (e: MouseEvent) => e.preventDefault(),
                type: "button",
            },
            iconSvg(label === "minus" ? "Minus" : "Plus", { size: 13, strokeWidth: 2.25 }),
        );

    return h(
        "div",
        { className: `inline-flex items-center h-8 rounded-[10px] surface select-none overflow-hidden ${className}` },
        createBtn("minus", -step),
        input,
        unit ? h("span", { className: "text-[11px] text-muted pr-1.5 select-none" }, unit) : null,
        createBtn("plus", step),
    );
}
