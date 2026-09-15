import { h } from "@/core/dom-utils";

export function createCard(...rows: HTMLElement[]): HTMLDivElement {
    return h("div", { className: "setting-card" }, ...rows);
}

export function createFormRow(
    label: string,
    control: HTMLElement,
    options: { tag?: "div" | "label" } = {},
): HTMLElement {
    const { tag = "div" } = options;

    return h(
        tag,
        {
            className: `flex items-center justify-between py-2.5 px-4 gap-4 calm-transition hover:bg-ink/[0.015] dark:hover:bg-white/[0.02] ${tag === "label" ? "cursor-pointer" : ""}`,
        },
        h(
            "span",
            { className: "text-[13px] font-medium text-ink dark:text-paper select-none whitespace-nowrap" },
            label,
        ),
        control,
    );
}
