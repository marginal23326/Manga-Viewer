import { h, setVisible } from "@/core/dom-utils";
import { bind } from "@/core/binding";
import { createSegmentedControl } from "./segmented-control";
import { createState } from "@/core/create-state";

export function createTabPane(...children: HTMLElement[]): HTMLDivElement {
    return h("div", { className: "pt-2 pb-1 px-0.5" }, ...children);
}

export interface TabItem {
    label: string;
    pane: HTMLElement;
}

export function createTabGroup(tabs: readonly TabItem[]): HTMLDivElement {
    const active = createState({ label: tabs[0]?.label ?? "" });

    active.onChange(
        "label",
        (label) => {
            for (const tab of tabs) setVisible(tab.pane, tab.label === label);
        },
        { immediate: true },
    );

    const strip = createSegmentedControl({
        binding: bind(active, "label"),
        items: tabs.map((t) => ({ text: t.label, value: t.label })),
    });

    return h(
        "div",
        {},
        h("div", { className: "mb-4" }, strip),
        h("div", { className: "min-h-[180px]" }, ...tabs.map((t) => t.pane)),
    );
}
