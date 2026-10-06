import { h, setVisible } from "@/core/dom-utils";
import type { Option } from "@/components/segmented-control";
import { iconSvg } from "@/core/icons";
import { randomId } from "@/core/utils";

interface SelectOptions<V extends string = string> {
    onChange?: (value: V) => void;
    placeholder?: string;
    width?: string;
}

interface SelectInstance<V extends string = string> {
    element: HTMLDivElement;
    setOptions: (newItems: readonly Option<V>[], newValue?: V | null) => void;
}

interface SelectState<V extends string> {
    items: Option<V>[];
    value: V | null;
}

function normalizeValue<V extends string>(items: readonly Option<V>[], newValue: string | null): V | null {
    return items.find((item) => item.value === newValue)?.value ?? null;
}

export function createSelect<V extends string = string>(options: SelectOptions<V> = {}): SelectInstance<V> {
    const { onChange = () => {}, placeholder = "Select…", width = "w-40" } = options;

    const menuId = `select-menu-${randomId()}`;
    const anchorName = `--${menuId}`;

    const input = h("input", {
        className:
            "w-full px-3.5 h-10 text-sm bg-transparent placeholder:text-fg/40 focus:outline-none transition-colors",
        oninput: () => render(input.value),
        placeholder: "Filter…",
        type: "text",
    });

    const noResults = h(
        "div",
        {
            className: "px-4 py-4 text-sm text-muted text-center",
            hidden: true,
        },
        "No matches",
    );

    const menu = h("ul", {
        className: "max-h-72 overflow-auto p-1.5 text-sm scrollbar-thin",
        onclick: (event: MouseEvent) => {
            const li = (event.target as HTMLElement | null)?.closest<HTMLLIElement>("li[data-value]");
            if (li) updateValue(li.dataset.value);
        },
    });

    const menuContainer = h(
        "div",
        {
            className: `select-menu-container panel`,
            id: menuId,
            onbeforetoggle: (event: Event) => {
                if (!("newState" in event) || event.newState !== "open") return;

                input.value = "";
                render();
            },
            onkeydown: (event: KeyboardEvent) => {
                if (!isOpen() || document.activeElement !== input) return;

                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                    return;
                }

                const action = inputActions[event.key];
                if (action) {
                    event.preventDefault();
                    event.stopPropagation();
                    action(event);
                }
            },
            ontoggle: (event: Event) => {
                if ("newState" in event && event.newState === "open") {
                    menuItems()
                        .find((li) => li.dataset.value === state.value)
                        ?.scrollIntoView({ behavior: "instant" });
                    input.focus();
                } else {
                    input.value = "";
                    clearFocusHighlight();
                    focusedIdx = -1;
                }
            },
            popover: "auto",
        },
        h("div", { className: "border-b relative" }, input),
        noResults,
        menu,
    );

    const text = h("span", { className: "block truncate" });
    const button = h(
        "button",
        {
            className: `relative ${width} inline-flex items-center h-8 pl-3 pr-7 rounded-lg text-[13px] font-medium text-left cursor-pointer text-fg hover:bg-fg/8 calm-transition focus-ring`,
            popovertarget: menuId,
            type: "button",
        },
        text,
        h(
            "span",
            { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center text-muted pr-2" },
            iconSvg("ChevronDown", { size: 14 }),
        ),
    );

    const selectEl = h("div", { className: "relative" }, button, menuContainer);

    button.style.setProperty("anchor-name", anchorName);
    menuContainer.style.setProperty("position-anchor", anchorName);

    const menuItems = (): HTMLLIElement[] => [...menu.children] as HTMLLIElement[];

    let focusedIdx = -1;
    const state: SelectState<V> = { items: [], value: null };

    const clearFocusHighlight = (): void => menuItems()[focusedIdx]?.classList.remove("select-option-highlight");

    const render = (filter = ""): void => {
        const needle = filter.toLowerCase();
        const filtered = state.items.filter((i) => i.text.toLowerCase().includes(needle));
        menu.replaceChildren(
            ...filtered.map((i) => {
                const isSelected = i.value === state.value;
                return h(
                    "li",
                    {
                        className:
                            "relative cursor-pointer select-none py-2 pl-3 pr-9 rounded-lg text-[13.5px] font-medium hover:select-option-highlight transition-colors duration-100 group",
                        dataset: { value: i.value },
                    },
                    h(
                        "span",
                        {
                            className: `block truncate ${isSelected ? "text-accent font-semibold" : ""}`,
                        },
                        i.text,
                    ),
                    isSelected
                        ? h(
                              "span",
                              { className: "absolute inset-y-0 right-0 flex items-center pr-3" },
                              iconSvg("Check", {
                                  className: "text-accent",
                                  size: 16,
                                  strokeWidth: 2.5,
                              }),
                          )
                        : null,
                );
            }),
        );
        setVisible(noResults, filtered.length === 0);
        focusedIdx = -1;
    };

    const updateFocus = (newIndex: number): void => {
        const currentItems = menuItems();
        const n = currentItems.length;
        if (n === 0) return;

        clearFocusHighlight();
        focusedIdx = ((newIndex % n) + n) % n;
        const target = currentItems[focusedIdx];
        target?.classList.add("select-option-highlight");
        target?.scrollIntoView({ behavior: "instant", block: "center" });
    };

    const updateTxt = (): void => {
        text.textContent = state.items.find((i) => i.value === state.value)?.text ?? placeholder;
    };

    const updateValue = (newValue: string | null | undefined): void => {
        const actualValue = normalizeValue(state.items, newValue ?? null);
        if (state.value !== actualValue) {
            state.value = actualValue;
            updateTxt();
            if (actualValue !== null) onChange(actualValue);
        }
        close();
    };

    const navigateVisualHighlight = (delta: number): void => {
        if (focusedIdx !== -1) {
            updateFocus(focusedIdx + delta);
            return;
        }
        const selectedIdx = menuItems().findIndex((li) => li.dataset.value === state.value);
        updateFocus(selectedIdx === -1 && delta > 0 ? 0 : selectedIdx);
    };

    const isOpen = (): boolean => menuContainer.matches(":popover-open");

    const close = (): void => {
        if (isOpen()) menuContainer.togglePopover(false);
    };

    const inputActions: Record<string, (event: KeyboardEvent) => void> = {
        ArrowDown: () => navigateVisualHighlight(1),
        ArrowUp: () => navigateVisualHighlight(-1),
        Enter: () => {
            const li = menuItems()[Math.max(focusedIdx, 0)];
            if (li) updateValue(li.dataset.value);
        },
        Tab: (ev) => navigateVisualHighlight(ev.shiftKey ? -1 : 1),
    };

    updateTxt();

    return {
        element: selectEl,
        setOptions: (newItems, newValue = null) => {
            state.items = [...newItems];
            state.value = normalizeValue(newItems, newValue);
            updateTxt();
            focusedIdx = -1;
        },
    };
}
