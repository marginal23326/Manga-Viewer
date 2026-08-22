import { $, $$, addClass, h, setVisible } from "@/core/dom-utils";

const TAB_BUTTON_ACTIVE_CLASSES = "text-ink dark:text-paper border-b-2 border-accent dark:border-accent-light";
const TAB_BUTTON_INACTIVE_HOVER_CLASSES =
    "text-ink/45 dark:text-paper/45 border-b-2 border-transparent hover:text-ink dark:hover:text-paper cursor-pointer";
const TAB_BUTTON_DISABLED_CLASSES =
    "cursor-not-allowed opacity-30 text-ink/30 dark:text-paper/25 border-b-2 border-transparent";
const TAB_BUTTON_BASE_CLASSES =
    "inline-block px-4 py-3 -mb-px text-sm font-medium calm-transition focus-ring rounded-t-lg";

interface TabButtonState {
    active?: boolean;
    disabled?: boolean;
}

function applyTabButtonState(
    button: HTMLButtonElement,
    { active = false, disabled = false }: TabButtonState = {},
): void {
    button.className = TAB_BUTTON_BASE_CLASSES;

    if (disabled) {
        addClass(button, TAB_BUTTON_DISABLED_CLASSES);
    } else if (active) {
        addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
    } else {
        addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
    }
}

export function createTabPane(id: string, isActive = false): HTMLDivElement {
    const pane = h("div", {
        className: "pt-4 pb-8 px-2",
        dataset: { tabPanel: "true" },
        hidden: !isActive,
        id,
    });
    return pane;
}

export interface TabOptions {
    isActive?: boolean;
    isDisabled?: boolean;
}

export interface TabGroup {
    createTab: (id: string, label: string, options?: TabOptions) => HTMLLIElement;
    getActiveId: () => string | undefined;
    setEnabled: (tabId: string, enabled: boolean) => void;
    switchTo: (targetTabId: string) => void;
}

export function createTabGroup(tabsContainer: Element, contentContainer: Element): TabGroup {
    function switchTo(targetTabId: string): void {
        for (const button of $$<HTMLButtonElement>("button[data-tab-button]", tabsContainer)) {
            const isTarget = button.dataset.controls === targetTabId;
            button.dataset.selected = isTarget ? "true" : "false";

            applyTabButtonState(button, { active: isTarget, disabled: button.disabled });
        }

        for (const pane of $$("div[data-tab-panel]", contentContainer)) {
            setVisible(pane, pane.id === targetTabId);
        }
    }

    function createTab(
        id: string,
        label: string,
        { isActive = false, isDisabled = false }: TabOptions = {},
    ): HTMLLIElement {
        const button = h(
            "button",
            {
                className: TAB_BUTTON_BASE_CLASSES,
                dataset: { controls: id, selected: isActive ? "true" : "false", tabButton: "true" },
                id: `${id}-tab`,
                type: "button",
            },
            label,
        );

        button.disabled = isDisabled;
        applyTabButtonState(button, { active: isActive, disabled: isDisabled });
        button.addEventListener("click", () => switchTo(id));

        return h("li", {}, button);
    }

    function setEnabled(tabId: string, enabled: boolean): void {
        const button = $<HTMLButtonElement>(`#${tabId}`, tabsContainer);
        if (!button) return;

        button.disabled = !enabled;
        const isSelected = button.dataset.selected === "true";
        applyTabButtonState(button, { active: enabled && isSelected, disabled: !enabled });
    }

    function getActiveId(): string | undefined {
        return $('button[data-selected="true"]', tabsContainer)?.id;
    }

    return { createTab, getActiveId, setEnabled, switchTo };
}
