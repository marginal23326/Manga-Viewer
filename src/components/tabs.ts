import { addClass, h, setVisible } from "@/core/dom-utils";

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

export function createTabPane(isActive = false): HTMLDivElement {
    const pane = h("div", {
        className: "pt-4 pb-8 px-2",
        dataset: { tabPanel: "true" },
        hidden: !isActive,
    });
    return pane;
}

export interface TabOptions {
    isActive?: boolean;
    isDisabled?: boolean;
}

export interface TabGroup {
    addTab: (label: string, pane: HTMLElement, options?: TabOptions) => void;
    getActivePane: () => HTMLElement | undefined;
    setEnabled: (pane: HTMLElement, enabled: boolean) => void;
    switchTo: (targetPane: HTMLElement) => void;
}

export function createTabGroup(tabsContainer: Element, contentContainer: Element): TabGroup {
    const entries: { button: HTMLButtonElement; pane: HTMLElement }[] = [];

    function switchTo(targetPane: HTMLElement): void {
        for (const entry of entries) {
            const isTarget = entry.pane === targetPane;
            entry.button.dataset.selected = isTarget ? "true" : "false";

            applyTabButtonState(entry.button, { active: isTarget, disabled: entry.button.disabled });
            setVisible(entry.pane, isTarget);
        }
    }

    function addTab(label: string, pane: HTMLElement, { isActive = false, isDisabled = false }: TabOptions = {}): void {
        const button = h(
            "button",
            {
                className: TAB_BUTTON_BASE_CLASSES,
                dataset: { selected: isActive ? "true" : "false", tabButton: "true" },
                type: "button",
            },
            label,
        );

        button.disabled = isDisabled;
        applyTabButtonState(button, { active: isActive, disabled: isDisabled });
        button.addEventListener("click", () => switchTo(pane));

        tabsContainer.append(h("li", {}, button));
        contentContainer.append(pane);
        entries.push({ button, pane });

        if (isActive) switchTo(pane);
    }

    function setEnabled(pane: HTMLElement, enabled: boolean): void {
        const entry = entries.find((item) => item.pane === pane);
        if (!entry) return;

        entry.button.disabled = !enabled;
        const isSelected = entry.button.dataset.selected === "true";
        applyTabButtonState(entry.button, { active: enabled && isSelected, disabled: !enabled });
    }

    function getActivePane(): HTMLElement | undefined {
        return entries.find((entry) => entry.button.dataset.selected === "true")?.pane;
    }

    return { addTab, getActivePane, setEnabled, switchTo };
}
