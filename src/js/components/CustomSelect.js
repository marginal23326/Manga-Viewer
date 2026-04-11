import { addClass, removeClass, toggleClass } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { positionElement, scrollToView } from "../core/Utils";

export function createSelect(options = {}) {
    const {
        id = `select-${Math.random().toString(36).slice(2, 7)}`,
        container,
        items = [],
        value = null,
        placeholder = "SELECT...",
        onChange = () => {},
        width = "w-40",
        appendTo = false,
        searchable = false,
        scroll = false,
        buttonClass = "",
    } = options;

    const selectEl = document.createElement("div");
    selectEl.id = id;
    selectEl.className = "relative";

    // Brutalist HTML Structure
    selectEl.innerHTML = `
    <button type="button"
        class="select-btn relative ${width} cursor-pointer bg-[#f4f4f0] dark:bg-[#0a0a0a] py-3 pl-4 pr-10 text-left text-black dark:text-white font-space font-bold uppercase tracking-wider focus:outline-none transition-all duration-150 ease-out border-2 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] active:translate-y-0 active:translate-x-0 active:shadow-none ${buttonClass}">
        <span class="select-text block truncate"></span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <i data-lucide="chevron-down" width="20" height="20" stroke-width="3" class="text-black dark:text-white"></i>
        </span>
    </button>
    <div class="select-menu-container absolute z-[100] mt-3 ${width} bg-[#f4f4f0] dark:bg-[#0a0a0a] border-4 border-black dark:border-white shadow-[8px_8px_0_0_#FF3366] focus:outline-none hidden flex-col">
        ${
            searchable
                ? `<div class="border-b-4 border-black dark:border-white relative">
                    <input type="text" placeholder="FILTER..." 
                        class="search-input w-full px-4 py-3 text-sm font-space font-bold uppercase tracking-widest bg-transparent text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:bg-black focus:text-white focus:placeholder:text-white/60 dark:focus:bg-white dark:focus:text-black dark:focus:placeholder:text-black/60 transition-colors">
                </div>`
                : ""
        }
        <div class="no-results px-4 py-4 text-sm font-space font-bold uppercase tracking-widest text-[#FF3366] bg-black dark:bg-white hidden text-center">
            ERR: NO MATCH
        </div>
        <ul class="select-menu max-h-64 overflow-auto py-0 text-sm no-scrollbar bg-[#f4f4f0] dark:bg-[#0a0a0a]" tabindex="-1"></ul>
    </div>
    `;

    const button = selectEl.querySelector(".select-btn"),
        text = selectEl.querySelector(".select-text"),
        menuContainer = selectEl.querySelector(".select-menu-container"),
        menu = selectEl.querySelector(".select-menu"),
        input = selectEl.querySelector(".search-input"),
        noResults = selectEl.querySelector(".no-results");

    let state = { items, value, open: false, filter: "" },
        focusedIdx = -1;

    // Brutalist focus classes (solid inversion)
    const focusClassesArray = ["bg-black", "!text-white", "dark:bg-white", "dark:!text-black"];

    const render = (filter = "") => {
        state.filter = filter.toLowerCase();
        const filtered = state.items.filter((i) => i.text.toLowerCase().includes(state.filter));
        menu.innerHTML = filtered
            .map(
                (i) =>
                    `<li data-value="${i.value}" class="relative cursor-pointer select-none py-3 pl-4 pr-10 text-black dark:text-white font-space font-bold uppercase tracking-wider border-b-2 border-black/10 dark:border-white/10 last:border-b-0 hover:bg-[#FF3366] hover:!text-white transition-colors duration-75 group">
                        <span class="block truncate ${i.value == state.value ? "text-[#FF3366] group-hover:!text-white" : "group-hover:!text-white"}">${i.text}</span>
                        ${i.value == state.value ? `<span class="absolute inset-y-0 right-0 flex items-center pr-3"><i data-lucide="check" class="h-5 w-5 text-[#FF3366] group-hover:!text-white" stroke-width="4"></i></span>` : ""}
                    </li>`,
            )
            .join("");
        toggleClass(noResults, "hidden", filtered.length > 0);
        renderIcons();
        focusedIdx = -1;
    };

    const updateFocus = (newIndex) => {
        const items = menu.children;
        const n = items.length;
        if (n === 0) return;
        if (items[focusedIdx]) {
            focusClassesArray.forEach((cls) => items[focusedIdx].classList.remove(cls));
        }
        focusedIdx = ((newIndex % n) + n) % n;
        focusClassesArray.forEach((cls) => items[focusedIdx].classList.add(cls));
        if (scroll) scrollToView(items[focusedIdx], "instant", "center");
    };

    const updateTxt = () => {
        text.textContent = state.items.find((i) => i.value == state.value)?.text ?? placeholder;
    };

    const setFocus = (target, visualIdx = -1) => {
        if (target === "list" && menu.children.length > 0) {
            updateFocus(visualIdx);
            menu.focus();
        } else if (target === "search" && input) {
            if (menu.children[focusedIdx]) {
                focusClassesArray.forEach((cls) => menu.children[focusedIdx].classList.remove(cls));
            }
            focusedIdx = -1;
            input.focus();
        }
    };

    const updateValue = (newValue, suppress = false) => {
        const exists = state.items.some((i) => i.value == newValue);
        const actualValue = exists ? newValue : null;
        if (state.value != actualValue) {
            state.value = actualValue;
            updateTxt();
            if (!suppress) onChange(state.value);
        }
        if (state.open) toggle(false);
    };

    const navigateVisualHighlight = (delta, currentList) => {
        if (currentList.length === 0) return;

        let targetIndex;
        if (focusedIdx === -1) {
            const currentValElementIndex = Array.from(currentList).findIndex((li) => li.dataset.value == state.value);
            targetIndex =
                currentValElementIndex !== -1 ? currentValElementIndex : delta > 0 ? 0 : currentList.length - 1;
        } else {
            targetIndex = focusedIdx + delta;
        }
        updateFocus(targetIndex);
    };

    const handleKeyDown = (e) => {
        if (!state.open) return;
        const list = menu.children,
            active = document.activeElement;
        const isInput = searchable && active === input,
            isList = active === menu;
        const select = () => {
            if (focusedIdx >= 0 && list[focusedIdx]) updateValue(list[focusedIdx].dataset.value);
        };

        const inputActions = {
            ArrowDown: () => navigateVisualHighlight(1, list),
            ArrowUp: () => navigateVisualHighlight(-1, list),
            Tab: (ev) => navigateVisualHighlight(ev.shiftKey ? -1 : 1, list),
            Enter: () => list.length > 0 && updateValue(list[focusedIdx >= 0 ? focusedIdx : 0].dataset.value),
            Escape: () => toggle(false),
        };
        const listActions = {
            ArrowDown: () => updateFocus(focusedIdx + 1),
            ArrowUp: () => {
                if (searchable && focusedIdx === 0) setFocus("search");
                else updateFocus(focusedIdx - 1);
            },
            Tab: (ev) => updateFocus(ev.shiftKey ? focusedIdx - 1 : focusedIdx + 1),
            Enter: select,
            " ": select,
            Escape: () => toggle(false),
        };

        const actionMap = isInput ? inputActions : isList ? listActions : {};
        const action = actionMap[e.key];

        if (action) {
            e.preventDefault();
            e.stopPropagation();
            action(e);
        } else if (searchable && isList && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            e.stopPropagation();
            setFocus("search");
        }
    };

    const clickOutside = (e) => {
        if (!button.contains(e.target) && !menuContainer.contains(e.target)) toggle(false);
    };

    const originalParent = menuContainer.parentElement;
    const repositionMenu = () => positionElement(menuContainer, button);
    const handleButtonClick = () => toggle();
    const handleMenuClick = (e) => {
        const li = e.target.closest("li[data-value]");
        if (li) updateValue(li.dataset.value);
    };
    const handleInput = () => render(input.value);
    const stopInputClickPropagation = (e) => e.stopPropagation();

    const toggle = (force) => {
        state.open = force ?? !state.open;
        toggleClass(menuContainer, "hidden", !state.open);

        // Ensure parent has relative positioning for z-index context if not appending to body
        if (!appendTo && state.open && selectEl.parentElement) {
            addClass(selectEl.parentElement, "relative z-[60]");
        } else if (!appendTo && !state.open && selectEl.parentElement) {
            removeClass(selectEl.parentElement, "relative z-[60]");
        }

        const method = state.open ? "addEventListener" : "removeEventListener";
        document[method]("click", clickOutside, true);
        menuContainer[method]("keydown", handleKeyDown);
        window[method]("scroll", repositionMenu);

        if (state.open) {
            document.body.appendChild(menuContainer);
            repositionMenu();
            menuContainer.focus();
            render(searchable ? (input.value = "") : "");
            const list = menu.children;
            const initialIdx = Array.from(list).findIndex((li) => li.dataset.value == state.value);
            const targetIdx = initialIdx !== -1 ? initialIdx : 0;

            if (initialIdx !== -1 && scroll) scrollToView(list[initialIdx], "instant");

            if (searchable) {
                input.focus();
            } else if (list.length > 0) {
                updateFocus(targetIdx);
                menu.focus();
            }
        } else {
            originalParent.appendChild(menuContainer);
            if (searchable && input) input.value = "";
            state.filter = "";
            if (menu.children[focusedIdx]) {
                focusClassesArray.forEach((cls) => menu.children[focusedIdx].classList.remove(cls));
            }
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
    if (container) container[appendTo ? "appendChild" : "replaceWith"](selectEl);

    return {
        element: selectEl,
        getValue: () => state.value,
        setValue: (newValue) => updateValue(newValue, true),
        setOptions: (newItems, newValue = null) => {
            state.items = [...newItems];
            const val = newItems.some((i) => i.value == newValue) ? newValue : null;
            state.value = val;
            updateTxt();
            focusedIdx = -1;
        },
        isOpen: () => state.open,
        destroy: () => {
            if (state?.open) toggle(false);
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
            state = null;
        },
    };
}
