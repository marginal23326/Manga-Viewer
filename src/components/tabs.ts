import { bind } from "@/core/binding";
import { createSegmentedControl } from "./segmented-control";
import { createState } from "@/core/create-state";
import { h } from "@/core/dom-utils";

interface TabItem {
    label: string;
    pane: HTMLElement;
}

export function createTabGroup(tabs: readonly TabItem[]): HTMLDivElement {
    const active = createState({ label: tabs[0]?.label ?? "" });

    active.onChange(
        "label",
        (label) => {
            for (const tab of tabs) tab.pane.classList.toggle("invisible", tab.label !== label);
        },
        { immediate: true },
    );

    const strip = createSegmentedControl({
        binding: bind(active, "label"),
        items: tabs.map((t) => ({ text: t.label, value: t.label })),
    });

    for (const tab of tabs) tab.pane.style.gridArea = "1 / 1";

    return h(
        "div",
        {},
        h("div", { className: "mb-4 flex" }, strip),
        h("div", { className: "grid items-start py-1" }, ...tabs.map((t) => t.pane)),
    );
}
