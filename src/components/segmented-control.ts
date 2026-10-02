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
    "relative flex-1 inline-flex items-center justify-center gap-1.5 px-3 h-7 rounded-lg text-[12.5px] font-medium whitespace-nowrap calm-transition focus-ring cursor-pointer select-none";
const BTN_ACTIVE = "bg-surface text-ink dark:text-paper shadow-xs";
const BTN_INACTIVE = "text-muted hover:text-ink dark:hover:text-paper";

export function createSegmentedControl<T extends string>({
    binding,
    className = "",
    items,
    signal,
}: SegmentedControlOptions<T>): HTMLDivElement {
    const buttons = items.map(({ icon, text, value }) =>
        h(
            "button",
            { "aria-label": text ? undefined : value, dataset: { value }, type: "button" },
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
            className: `inline-flex items-center p-0.5 rounded-[10px] bg-ink/[0.05] dark:bg-white/[0.06] gap-0.5 select-none shrink-0 ${className}`,
            onclick: (e: MouseEvent) => {
                const target = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
                if (target) binding.set(target.dataset.value as T);
            },
        },
        ...buttons,
    );
}
