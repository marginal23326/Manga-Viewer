import { h, setVisible } from "@/core/dom-utils";
import { createSegmentedControl } from "./segmented-control";

export function createTabPane(...children: HTMLElement[]): HTMLDivElement {
    return h("div", { className: "pt-2 pb-1 px-0.5", dataset: { tabPanel: "true" } }, ...children);
}

export interface TabItem {
    isActive?: boolean;
    label: string;
    pane: HTMLElement;
}

export interface TabGroup {
    destroy: () => void;
    element: HTMLDivElement;
}

export function createTabGroup(tabs: TabItem[]): TabGroup {
    let activeLabel = tabs.find((t) => t.isActive)?.label ?? tabs[0]?.label ?? "";
    const panesContainer = h("div", { className: "min-h-[180px]", id: "settings-tab-content" });

    const segmented = createSegmentedControl({
        items: tabs.map((t) => ({ text: t.label, value: t.label })),
        onChange: (label) => select(label),
        value: activeLabel,
    });

    function select(label: string): void {
        activeLabel = label;
        segmented.setValue(label);
        for (const tab of tabs) setVisible(tab.pane, tab.label === label);
    }

    for (const tab of tabs) {
        panesContainer.append(tab.pane);
        setVisible(tab.pane, tab.label === activeLabel);
    }

    const element = h("div", {}, h("div", { className: "mb-4" }, segmented.element), panesContainer);

    return {
        destroy: () => segmented.destroy(),
        element,
    };
}
