import { type IconName, iconSvg } from "@/core/icons";
import type { Binding } from "@/core/binding";
import { h } from "@/core/dom-utils";

export interface Option<V extends string = string> {
    icon?: IconName;
    text?: string;
    value: V;
}

interface SegmentedControlOptions<T extends string> {
    binding: Binding<T>;
    className?: string;
    items: readonly Option<T>[];
    signal?: AbortSignal;
}

const BTN_BASE =
    "relative flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 min-h-[28px] rounded-lg text-xs font-medium whitespace-nowrap calm-transition focus-ring cursor-pointer select-none border border-transparent";
const BTN_ACTIVE = "surface text-ink dark:text-paper font-semibold shadow-xs border-line/70 dark:border-white/10";
const BTN_INACTIVE = "text-muted hover:text-ink dark:hover:text-paper hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]";

export function createSegmentedControl<T extends string>({
    binding,
    className = "",
    items,
    signal,
}: SegmentedControlOptions<T>): HTMLDivElement {
    const buttons = items.map(({ icon, text, value }) =>
        h(
            "button",
            { dataset: { value }, type: "button" },
            icon ? iconSvg(icon, { className: "shrink-0", size: 14 }) : null,
            text,
        ),
    );

    binding.subscribe((current) => {
        for (const btn of buttons) {
            btn.className = `${BTN_BASE} ${btn.dataset.value === current ? BTN_ACTIVE : BTN_INACTIVE}`;
        }
    }, signal);

    return h(
        "div",
        {
            className: `inline-flex items-center p-0.5 rounded-xl bg-ink/[0.04] dark:bg-white/[0.05] border border-line/60 gap-0.5 select-none shrink-0 ${className}`,
            onclick: (e: MouseEvent) => {
                const target = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
                if (target) binding.set(target.dataset.value as T);
            },
        },
        ...buttons,
    );
}
