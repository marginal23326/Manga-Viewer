import { type Option, iconSvg } from "@/core/icons";
import { h } from "@/core/dom-utils";

export interface SegmentedControlOptions<T extends string = string> {
    className?: string;
    items: readonly Option<T>[];
    onChange?: (value: T) => void;
    value: T;
}

export interface SegmentedControlInstance<T extends string = string> {
    destroy: () => void;
    element: HTMLDivElement;
    setValue: (newValue: T) => void;
}

const BTN_BASE =
    "relative inline-flex items-center justify-center gap-1.5 px-2.5 py-1 min-h-[28px] rounded-lg text-xs font-medium calm-transition focus-ring cursor-pointer select-none border border-transparent";
const BTN_ACTIVE = "surface text-ink dark:text-paper font-semibold shadow-xs border-line/70 dark:border-white/10";
const BTN_INACTIVE = "text-muted hover:text-ink dark:hover:text-paper hover:bg-ink/[0.04] dark:hover:bg-white/[0.05]";

export function createSegmentedControl<T extends string = string>(
    options: SegmentedControlOptions<T>,
): SegmentedControlInstance<T> {
    const { className = "", items, onChange, value } = options;

    let currentValue = value;
    const buttons = items.map(({ icon, text, value: val }) =>
        h(
            "button",
            { dataset: { value: val }, type: "button" },
            icon ? iconSvg(icon, { className: "shrink-0", size: 14 }) : null,
            text,
        ),
    );

    function sync(): void {
        for (const btn of buttons) {
            btn.className = `${BTN_BASE} ${btn.dataset.value === currentValue ? BTN_ACTIVE : BTN_INACTIVE}`;
        }
    }

    const container = h(
        "div",
        {
            className: `inline-flex items-center p-0.5 rounded-xl bg-ink/[0.04] dark:bg-white/[0.05] border border-line/60 gap-0.5 select-none shrink-0 ${className}`,
            onclick: (e: MouseEvent) => {
                const target = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
                if (!target) return;
                const val = target.dataset.value as T;
                if (val === currentValue) return;
                currentValue = val;
                sync();
                onChange?.(val);
            },
        },
        ...buttons,
    );

    sync();

    return {
        destroy: () => container.remove(),
        element: container,
        setValue: (newValue: T) => {
            currentValue = newValue;
            sync();
        },
    };
}
