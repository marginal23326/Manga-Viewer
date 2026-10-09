import { h } from "@/core/dom-utils";

export function createCard(...rows: HTMLElement[]): HTMLDivElement {
    return h("div", { className: "setting-card" }, ...rows);
}

export function createFormRow(
    label: string,
    control: HTMLElement,
    { tag = "div" }: { tag?: "div" | "label" } = {},
): HTMLElement {
    return h(
        tag,
        {
            className: `flex items-center justify-between py-2.5 px-4 gap-4 calm-transition hover:bg-fg/2 ${tag === "label" ? "cursor-pointer" : ""}`,
        },
        h("span", { className: "text-[13px] font-medium select-none whitespace-nowrap" }, label),
        control,
    );
}
