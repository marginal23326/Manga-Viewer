import { addClass, h, removeClass, toggleClass } from "@/core/dom-utils";
import { positionElement, scrollToView } from "@/core/utils";
import { iconSvg } from "@/core/icons";

export interface SelectItem<V extends string = string> {
    text: string;
    value: V;
}

export interface SelectOptions<V extends string = string> {
    appendTo?: boolean;
    buttonClass?: string;
    container?: Element | null;
    id?: string;
    items?: SelectItem<V>[];
    onChange?: (value: V) => void;
    placeholder?: string;
    scroll?: boolean;
    searchable?: boolean;
    value?: V | null;
    width?: string;
}

export interface SelectInstance<V extends string = string> {
    destroy: () => void;
    element: HTMLDivElement;
    getValue: () => V | null;
    isOpen: () => boolean;
    setOptions: (newItems: SelectItem<V>[], newValue?: V | null) => void;
    setValue: (newValue: V) => void;
}

interface SelectState<V extends string> {
    filter: string;
    items: SelectItem<V>[];
    open: boolean;
    value: V | null;
}

const stopInputClickPropagation = (event: Event): void => event.stopPropagation();

function normalizeValue<V extends string>(items: SelectItem<V>[], newValue: string | null): V | null {
    return items.find((item) => item.value === String(newValue))?.value ?? null;
}

export function createSelect<V extends string = string>(options: SelectOptions<V> = {}): SelectInstance<V> {
    const {
        appendTo = false,
        buttonClass = "",
        container = null,
        id = `select-${Math.random().toString(36).slice(2, 7)}`,
        items = [],
        onChange = () => {},
        placeholder = "SELECT...",
        scroll = false,
        searchable = false,
        value = null,
        width = "w-40",
    } = options;

    const selectEl = h("div", { className: "relative", id });

    const text = h("span", { className: "select-text block truncate" });
    const button = h(
        "button",
        {
            className: `select-btn relative ${width} cursor-pointer bg-paper dark:bg-ink py-3 pl-4 pr-10 text-left text-black dark:text-white font-space font-bold uppercase tracking-wider focus:outline-none brutal-transition brutal-box-hover brutal-box ${buttonClass}`,
            type: "button",
        },
        text,
        h(
            "span",
            { className: "pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" },
            iconSvg("ChevronDown", { className: "text-black dark:text-white", size: 20, strokeWidth: 3 }),
        ),
    );

    const input = searchable
        ? h("input", {
              className:
                  "search-input w-full px-4 py-3 text-sm text-label bg-transparent text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:bg-black focus:text-white focus:placeholder:text-white/60 dark:focus:bg-white dark:focus:text-black dark:focus:placeholder:text-black/60 transition-colors",
              placeholder: "FILTER...",
              type: "text",
          })
        : null;

    const noResults = h(
        "div",
        {
            className: "no-results px-4 py-4 text-sm text-label text-accent bg-black dark:bg-white hidden text-center",
        },
        "ERR: NO MATCH",
    );

    const menu = h("ul", {
        className: "select-menu max-h-64 overflow-auto py-0 text-sm no-scrollbar bg-paper dark:bg-ink",
        tabindex: "-1",
    });

    const menuContainer = h(
        "div",
        {
            className: `select-menu-container absolute z-100 mt-3 ${width} bg-paper dark:bg-ink brutal-box-xl-accent focus:outline-none hidden flex-col`,
        },
        searchable ? h("div", { className: "border-b-4 border-black dark:border-white relative" }, input) : null,
        noResults,
        menu,
    );

    selectEl.append(button, menuContainer);

    const menuItems = (): HTMLLIElement[] => [...menu.children] as HTMLLIElement[];

    let focusedIdx = -1;
    const state: SelectState<V> = { filter: "", items: [...items], open: false, value: normalizeValue(items, value) };

    const focusClassesArray = ["bg-black", "!text-white", "dark:bg-white", "dark:!text-black"];
    const clearFocusHighlight = (): void => menuItems()[focusedIdx]?.classList.remove(...focusClassesArray);

    const render = (filter = ""): void => {
        state.filter = filter.toLowerCase();
        const filtered = state.items.filter((i) => i.text.toLowerCase().includes(state.filter));
        menu.replaceChildren(
            ...filtered.map((i) => {
                const isSelected = i.value === state.value;
                return h(
                    "li",
                    {
                        className:
                            "relative cursor-pointer select-none py-3 pl-4 pr-10 text-black dark:text-white font-space font-bold uppercase tracking-wider border-b-2 border-black/10 dark:border-white/10 last:border-b-0 hover:bg-accent hover:text-white! transition-colors duration-75 group",
                        dataset: { value: i.value },
                    },
                    h(
                        "span",
                        {
                            className: `block truncate ${isSelected ? "text-accent group-hover:text-white!" : "group-hover:text-white!"}`,
                        },
                        i.text,
                    ),
                    isSelected
                        ? h(
                              "span",
                              { className: "absolute inset-y-0 right-0 flex items-center pr-3" },
                              iconSvg("Check", {
                                  className: "text-accent group-hover:text-white!",
                                  size: 20,
                                  strokeWidth: 4,
                              }),
                          )
                        : null,
                );
            }),
        );
        toggleClass(noResults, "hidden", filtered.length > 0);
        focusedIdx = -1;
    };

    const updateFocus = (newIndex: number): void => {
        const currentItems = menuItems();
        const n = currentItems.length;
        if (n === 0) return;

        clearFocusHighlight();
        focusedIdx = ((newIndex % n) + n) % n;
        currentItems[focusedIdx]?.classList.add(...focusClassesArray);
        if (scroll) {
            const target = currentItems[focusedIdx];
            if (target) scrollToView(target, "instant", "center");
        }
    };

    const updateTxt = (): void => {
        text.textContent = state.items.find((i) => i.value === state.value)?.text ?? placeholder;
    };

    const setFocus = (target: "list" | "search", visualIdx = -1): void => {
        if (target === "list" && menu.children.length > 0) {
            updateFocus(visualIdx);
            menu.focus();
        } else if (target === "search" && input) {
            clearFocusHighlight();
            focusedIdx = -1;
            input.focus();
        }
    };

    const updateValue = (newValue: string | null | undefined, suppress = false): void => {
        const actualValue = normalizeValue(state.items, newValue ?? null);
        if (state.value !== actualValue) {
            state.value = actualValue;
            updateTxt();
            if (!suppress && actualValue !== null) onChange(actualValue);
        }
        if (state.open) toggle(false);
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

    const handleKeyDown = (event: KeyboardEvent): void => {
        if (!state.open) return;

        const active = document.activeElement;
        const list = menuItems();
        const isInput = searchable && active === input;
        const isList = active === menu;
        const select = (): void => {
            const li = list[focusedIdx];
            if (focusedIdx >= 0 && li) updateValue(li.dataset.value);
        };

        const inputActions: Record<string, (event: KeyboardEvent) => void> = {
            ArrowDown: () => navigateVisualHighlight(1, list),
            ArrowUp: () => navigateVisualHighlight(-1, list),
            Enter: () => {
                const li = list[Math.max(focusedIdx, 0)];
                if (list.length > 0 && li) updateValue(li.dataset.value);
            },
            Escape: () => toggle(false),
            Tab: (ev) => navigateVisualHighlight(ev.shiftKey ? -1 : 1, list),
        };
        const listActions: Record<string, (event: KeyboardEvent) => void> = {
            " ": select,
            ArrowDown: () => updateFocus(focusedIdx + 1),
            ArrowUp: () => {
                if (searchable && focusedIdx === 0) setFocus("search");
                else updateFocus(focusedIdx - 1);
            },
            Enter: select,
            Escape: () => toggle(false),
            Tab: (ev) => updateFocus(ev.shiftKey ? focusedIdx - 1 : focusedIdx + 1),
        };

        let actionMap: Record<string, (event: KeyboardEvent) => void> = {};
        if (isInput) {
            actionMap = inputActions;
        } else if (isList) {
            actionMap = listActions;
        }
        const action = actionMap[event.key];

        if (action) {
            event.preventDefault();
            event.stopPropagation();
            action(event);
        } else if (searchable && isList && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
            event.stopPropagation();
            setFocus("search");
        }
    };

    const clickOutside = (event: MouseEvent): void => {
        const target = event.target as Node | null;
        if (!button.contains(target) && !menuContainer.contains(target)) toggle(false);
    };

    const originalParent = menuContainer.parentElement;
    const repositionMenu = (): void => positionElement(menuContainer, button);
    const handleButtonClick = (): void => toggle();
    const handleMenuClick = (event: MouseEvent): void => {
        const li = (event.target as HTMLElement | null)?.closest<HTMLLIElement>("li[data-value]");
        if (li) updateValue(li.dataset.value);
    };
    const handleInput = (): void => render(input?.value);

    const toggle = (force?: boolean): void => {
        state.open = force ?? !state.open;
        toggleClass(menuContainer, "hidden", !state.open);

        if (!appendTo && selectEl.parentElement) {
            if (state.open) {
                addClass(selectEl.parentElement, "relative z-[60]");
            } else {
                removeClass(selectEl.parentElement, "relative z-[60]");
            }
        }

        if (state.open) {
            document.addEventListener("click", clickOutside, true);
            menuContainer.addEventListener("keydown", handleKeyDown);
            window.addEventListener("scroll", repositionMenu);
        } else {
            document.removeEventListener("click", clickOutside, true);
            menuContainer.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", repositionMenu);
        }

        if (state.open) {
            document.body.append(menuContainer);
            repositionMenu();
            menuContainer.focus();
            if (input) input.value = "";
            render();
            const list = menuItems();
            const initialIdx = list.findIndex((li) => li.dataset.value === String(state.value));
            const targetIdx = initialIdx === -1 ? 0 : initialIdx;

            if (initialIdx !== -1 && scroll) {
                const target = list[initialIdx];
                if (target) scrollToView(target, "instant");
            }

            if (searchable) {
                input?.focus();
            } else if (list.length > 0) {
                updateFocus(targetIdx);
                menu.focus();
            }
        } else {
            originalParent?.append(menuContainer);
            if (searchable && input) input.value = "";
            state.filter = "";
            clearFocusHighlight();
            focusedIdx = -1;
        }
    };

    button.addEventListener("click", handleButtonClick);
    menu.addEventListener("click", handleMenuClick);
    if (searchable && input) {
        input.addEventListener("input", handleInput);
        input.addEventListener("click", stopInputClickPropagation);
    }

    updateTxt();
    if (container) {
        if (appendTo) {
            container.append(selectEl);
        } else {
            container.replaceWith(selectEl);
        }
    }

    return {
        destroy: () => {
            if (state.open) toggle(false);
            document.removeEventListener("click", clickOutside, true);
            menuContainer.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", repositionMenu);
            button.removeEventListener("click", handleButtonClick);
            menu.removeEventListener("click", handleMenuClick);
            if (searchable && input) {
                input.removeEventListener("input", handleInput);
                input.removeEventListener("click", stopInputClickPropagation);
            }
            menuContainer.remove();
            selectEl.remove();
        },
        element: selectEl,
        getValue: () => state.value,
        isOpen: () => state.open,
        setOptions: (newItems, newValue = null) => {
            state.items = [...newItems];
            state.value = normalizeValue(newItems, newValue);
            updateTxt();
            focusedIdx = -1;
        },
        setValue: (newValue) => updateValue(newValue, true),
    };
}
