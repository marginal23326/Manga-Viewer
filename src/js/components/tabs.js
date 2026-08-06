import { $, $$, addClass, getDataAttribute, h, setDataAttribute, toggleClass } from "../core/dom-utils";

const TAB_BUTTON_ACTIVE_CLASSES =
    "bg-black text-white dark:bg-white dark:text-black brutal-border brutal-shadow-accent translate-y-[-2px] translate-x-[-2px]";
const TAB_BUTTON_INACTIVE_HOVER_CLASSES =
    "hover:bg-accent hover:text-white hover:border-accent text-black dark:text-white border-transparent";
const TAB_BUTTON_DISABLED_CLASSES = "cursor-not-allowed opacity-30 text-gray-400 dark:text-gray-500 border-transparent";
const TAB_BUTTON_BASE_CLASSES = "inline-block px-4 py-3 border-2 border-b-0 uppercase transition-all duration-150";

function applyTabButtonState(button, { active = false, disabled = false } = {}) {
    button.className = TAB_BUTTON_BASE_CLASSES;

    if (disabled) {
        addClass(button, TAB_BUTTON_DISABLED_CLASSES);
    } else if (active) {
        addClass(button, TAB_BUTTON_ACTIVE_CLASSES);
    } else {
        addClass(button, TAB_BUTTON_INACTIVE_HOVER_CLASSES);
    }
}

export function createTabPane(id, isActive = false) {
    const pane = h("div", {
        className: "pt-4 pb-8 px-2",
        "data-tab-panel": "true",
        id,
    });
    if (!isActive) addClass(pane, "hidden");
    return pane;
}

export function createTabGroup(tabsContainer, contentContainer) {
    function switchTo(targetTabId) {
        $$("button[data-tab-button]", tabsContainer).forEach((button) => {
            const isTarget = getDataAttribute(button, "controls") === targetTabId;
            setDataAttribute(button, "selected", isTarget ? "true" : "false");

            applyTabButtonState(button, { active: isTarget, disabled: button.disabled });
        });

        $$("div[data-tab-panel]", contentContainer).forEach((pane) => {
            toggleClass(pane, "hidden", pane.id !== targetTabId);
        });
    }

    function createTab(id, label, { isActive = false, isDisabled = false } = {}) {
        const button = h(
            "button",
            {
                className: TAB_BUTTON_BASE_CLASSES,
                "data-tab-button": "true",
                dataset: { controls: id, selected: isActive ? "true" : "false" },
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

    function setEnabled(tabId, enabled) {
        const button = $(`#${tabId}`, tabsContainer);
        if (!button) return;

        button.disabled = !enabled;
        const isSelected = getDataAttribute(button, "selected") === "true";
        applyTabButtonState(button, { active: enabled && isSelected, disabled: !enabled });
    }

    function getActiveId() {
        return $('button[data-selected="true"]', tabsContainer)?.id;
    }

    return { createTab, getActiveId, setEnabled, switchTo };
}
