import { type Option, iconSvg } from "@/core/icons";
import { h, setVisible } from "@/core/dom-utils";

interface SelectOptions<V extends string = string> {
    items?: readonly Option<V>[];
    onChange?: (value: V) => void;
    placeholder?: string;
    scroll?: boolean;
    searchable?: boolean;
    value?: V | null;
    width?: string;
}

export interface SelectInstance<V extends string = string> {
    element: HTMLDivElement;
    isOpen: () => boolean;
    setOptions: (newItems: readonly Option<V>[], newValue?: V | null) => void;
}

interface SelectState<V extends string> {
    filter: string;
    items: Option<V>[];
    value: V | null;
}

function normalizeValue<V extends string>(items: readonly Option<V>[], newValue: string | null): V | null {
    return items.find((item) => item.value === String(newValue))?.value ?? null;
}

export function createSelect<V extends string = string>(options: SelectOptions<V> = {}): SelectInstance<V> {
    const {
        items = [],
        onChange = () => {},
        placeholder = "Select…",
        scroll = false,
        searchable = false,
        value = null,
        width = "w-40",
    } = options;

    const menuId = `select-menu-${Math.random().toString(36).slice(2, 7)}`;
    const anchorName = `--${menuId}`;

    const input = searchable
        ? h("input", {
              className:
                  "w-full px-4 py-2.5 text-sm bg-transparent text-ink dark:text-paper placeholder:text-ink/35 dark:placeholder:text-paper/30 focus:outline-none transition-colors",
              oninput: () => render(input?.value),
              placeholder: "Filter…",
              type: "text",
          })
        : null;

    const noResults = h(
        "div",
        {
            className: "px-4 py-4 text-sm text-muted text-center",
            hidden: true,
        },
        "No matches",
    );

    const menu = h("ul", {
        className: "max-h-64 overflow-auto py-1.5 text-sm scrollbar-thin",
        onclick: (event: MouseEvent) => {
            const li = (event.target as HTMLElement | null)?.closest<HTMLLIElement>("li[data-value]");
            if (li) updateValue(li.dataset.value);
        },
        tabindex: "-1",
    });

    const menuContainer = h(
        "div",
        {
            className: `select-menu-container surface-panel`,
            id: menuId,
            onbeforetoggle: (event: Event) => {
                if (!("newState" in event) || event.newState !== "open") return;

                if (searchable && input) input.value = "";
                state.filter = "";
                render();
            },
            onkeydown: (event: KeyboardEvent) => {
                if (!isOpen()) return;

                if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                    return;
                }

                const active = document.activeElement;
                const isInput = searchable && active === input;
                const isList = active === menu;

                let actionMap: Record<string, (event: KeyboardEvent) => void> | null = null;
                if (isInput) {
                    actionMap = inputActions;
                } else if (isList) {
                    actionMap = listActions;
                }
                const action = actionMap?.[event.key];

                if (action) {
                    event.preventDefault();
                    event.stopPropagation();
                    action(event);
                } else if (searchable && isList && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
                    event.stopPropagation();
                    setFocus("search");
                }
            },
            ontoggle: (event: Event) => {
                if ("newState" in event && event.newState === "open") {
                    const list = menuItems();
                    const initialIdx = list.findIndex((li) => li.dataset.value === String(state.value));
                    if (initialIdx !== -1 && scroll) {
                        const target = list[initialIdx];
                        if (target) target.scrollIntoView({ behavior: "instant" });
                    }

                    if (searchable) {
                        input?.focus();
                    } else if (list.length > 0) {
                        updateFocus(initialIdx === -1 ? 0 : initialIdx);
                        menu.focus();
                    }
                } else {
                    state.filter = "";
                    if (searchable && input) input.value = "";
                    clearFocusHighlight();
                    focusedIdx = -1;
                }
            },
            popover: "auto",
        },
        searchable ? h("div", { className: "border-b divider-line relative" }, input) : null,
        noResults,
        menu,
    );

    const text = h("span", { className: "block truncate" });
    const button = h(
        "button",
        {
            className: `relative ${width} cursor-pointer input-field py-2.5 pl-4 pr-9 text-left font-medium calm-transition`,
            popovertarget: menuId,
            type: "button",
        },
        text,
        h(
            "span",
            {
                className: "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted",
            },
            iconSvg("ChevronDown", { size: 16 }),
        ),
    );

    const selectEl = h("div", { className: "relative" }, button, menuContainer);

    button.style.setProperty("anchor-name", anchorName);
    menuContainer.style.setProperty("position-anchor", anchorName);

    const menuItems = (): HTMLLIElement[] => [...menu.children] as HTMLLIElement[];

    let focusedIdx = -1;
    const state: SelectState<V> = { filter: "", items: [...items], value: normalizeValue(items, value) };

    const clearFocusHighlight = (): void => menuItems()[focusedIdx]?.classList.remove("select-option-highlight");

    const render = (filter = ""): void => {
        state.filter = filter.toLowerCase();
        const filtered = state.items.filter((i) => (i.text ?? "").toLowerCase().includes(state.filter));
        menu.replaceChildren(
            ...filtered.map((i) => {
                const isSelected = i.value === state.value;
                return h(
                    "li",
                    {
                        className:
                            "relative cursor-pointer select-none py-2.5 pl-4 pr-9 mx-1.5 rounded-lg text-ink dark:text-paper text-sm font-medium hover:select-option-highlight transition-colors duration-100 group",
                        dataset: { value: i.value },
                    },
                    h(
                        "span",
                        {
                            className: `block truncate ${isSelected ? "text-accent dark:text-accent-light font-semibold" : ""}`,
                        },
                        i.text,
                    ),
                    isSelected
                        ? h(
                              "span",
                              { className: "absolute inset-y-0 right-0 flex items-center pr-3" },
                              iconSvg("Check", {
                                  className: "text-accent dark:text-accent-light",
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
        currentItems[focusedIdx]?.classList.add("select-option-highlight");
        if (scroll) {
            const target = currentItems[focusedIdx];
            if (target) target.scrollIntoView({ behavior: "instant", block: "center" });
        }
    };

    const updateTxt = (): void => {
        text.textContent = state.items.find((i) => i.value === state.value)?.text ?? placeholder;
    };

    const setFocus = (target: "list" | "search"): void => {
        if (target === "list" && menu.children.length > 0) {
            updateFocus(focusedIdx);
            menu.focus();
        } else if (target === "search" && input) {
            clearFocusHighlight();
            focusedIdx = -1;
            input.focus();
        }
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

    const navigateVisualHighlight = (delta: number, currentList: HTMLLIElement[]): void => {
        if (currentList.length === 0) return;

        let targetIndex: number;
        if (focusedIdx === -1) {
            const currentValElementIndex = currentList.findIndex((li) => li.dataset.value === String(state.value));
            if (currentValElementIndex === -1) {
                targetIndex = delta > 0 ? 0 : currentList.length - 1;
            } else {
                targetIndex = currentValElementIndex;
            }
        } else {
            targetIndex = focusedIdx + delta;
        }
        updateFocus(targetIndex);
    };

    const isOpen = (): boolean => menuContainer.matches(":popover-open");

    const close = (): void => {
        if (isOpen()) menuContainer.togglePopover(false);
    };

    const selectFocused = (): void => {
        const li = menuItems()[focusedIdx];
        if (focusedIdx >= 0 && li) updateValue(li.dataset.value);
    };

    const inputActions: Record<string, (event: KeyboardEvent) => void> = {
        ArrowDown: () => navigateVisualHighlight(1, menuItems()),
        ArrowUp: () => navigateVisualHighlight(-1, menuItems()),
        Enter: () => {
            const list = menuItems();
            const li = list[Math.max(focusedIdx, 0)];
            if (list.length > 0 && li) updateValue(li.dataset.value);
        },
        Tab: (ev) => navigateVisualHighlight(ev.shiftKey ? -1 : 1, menuItems()),
    };
    const listActions: Record<string, (event: KeyboardEvent) => void> = {
        " ": selectFocused,
        ArrowDown: () => updateFocus(focusedIdx + 1),
        ArrowUp: () => {
            if (searchable && focusedIdx === 0) setFocus("search");
            else updateFocus(focusedIdx - 1);
        },
        Enter: selectFocused,
        Tab: (ev) => updateFocus(ev.shiftKey ? focusedIdx - 1 : focusedIdx + 1),
    };

    updateTxt();

    return {
        element: selectEl,
        isOpen,
        setOptions: (newItems, newValue = null) => {
            state.items = [...newItems];
            state.value = normalizeValue(newItems, newValue);
            updateTxt();
            focusedIdx = -1;
        },
    };
}
