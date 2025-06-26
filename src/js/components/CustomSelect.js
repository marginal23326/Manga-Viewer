import { addClass, removeClass, toggleClass } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { positionElement, scrollToView } from "../core/Utils";

export function createSelect(options = {}) {
    const {
        id = `select-${Math.random().toString(36).slice(2, 7)}`,
        container,
        items = [],
        value = null,
        placeholder = "Select...",
        onChange = () => {},
        width = "w-40",
        appendTo = false,
        searchable = false,
        scroll = false,
    } = options;

    const selectEl = document.createElement("div");
    selectEl.id = id;
    selectEl.className = "relative";
    selectEl.innerHTML = `<button type="button"
    class="select-btn relative ${width} cursor-default rounded-md bg-white dark:bg-gray-800 py-1.5 pl-3 pr-10 text-left text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-75"><span
        class="select-text block truncate"></span><span
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><i data-lucide="chevron-down"
            width="16" height="16" class="text-gray-400"></i></span></button><div
    class="select-menu-container absolute z-50 mt-1 ${width} rounded-md bg-white dark:bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden flex-col">
    ${searchable ? `<div class="p-1 border-b border-gray-200 dark:border-gray-600"><input type="text"
            placeholder="Search..."
            class="search-input w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
    </div>` : ""}<div class="no-results px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic hidden">No results
        found</div>
    <ul class="select-menu max-h-52 overflow-auto py-1 text-base sm:text-sm no-scrollbar" tabindex="-1"></ul></div>
    `;

    const button = selectEl.querySelector(".select-btn"),
        text = selectEl.querySelector(".select-text"),
        menuContainer = selectEl.querySelector(".select-menu-container"),
        menu = selectEl.querySelector(".select-menu"),
        input = selectEl.querySelector(".search-input"),
        noResults = selectEl.querySelector(".no-results");
    let state = { items, value, open: false, filter: "" },
        focusedIdx = -1;
    const focusClasses = "bg-blue-100 dark:bg-blue-600/50";

    const render = (filter = "") => {
        state.filter = filter.toLowerCase();
        const filtered = state.items.filter((i) => i.text.toLowerCase().includes(state.filter));
        menu.innerHTML = filtered
            .map(
                (i) => `<li data-value="${i.value}" class="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-600/50"><span class="block truncate ${i.value == state.value ? "font-semibold" : ""}">${i.text}</span>${i.value == state.value ? `<span class="absolute inset-y-0 right-0 flex items-center pr-2"><i data-lucide="circle-check" class="h-5 w-5 text-blue-600 dark:text-blue-400"></i></span>` : ""}</li>`,
            ).join("");
        toggleClass(noResults, "hidden", filtered.length > 0);
        renderIcons();
        focusedIdx = -1;
    };

    const updateFocus = (newIndex) => {
        const items = menu.children;
        const n = items.length;
        if (n === 0) return;
        if (items[focusedIdx]) removeClass(items[focusedIdx], focusClasses);
        focusedIdx = ((newIndex % n) + n) % n;
        addClass(items[focusedIdx], focusClasses);
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
            if (menu.children[focusedIdx]) removeClass(menu.children[focusedIdx], focusClasses);
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
            const currentValElementIndex = Array.from(currentList).findIndex(li => li.dataset.value == state.value);
            targetIndex = currentValElementIndex !== -1 ? currentValElementIndex : (delta > 0 ? 0 : currentList.length - 1);
        } else {
            targetIndex = focusedIdx + delta;
        }
        updateFocus(targetIndex);
    };

    const handleKeyDown = (e) => {
        if (!state.open) return;
        const list = menu.children, active = document.activeElement;
        const isInput = searchable && active === input, isList = active === menu;
        const select = () => { if (focusedIdx >= 0 && list[focusedIdx]) updateValue(list[focusedIdx].dataset.value); };

        const inputActions = {
            ArrowDown: () => navigateVisualHighlight(1, list),
            ArrowUp: () => navigateVisualHighlight(-1, list),
            Tab: (ev) => navigateVisualHighlight(ev.shiftKey ? -1 : 1, list),
            Enter: () => list.length > 0 && updateValue(list[focusedIdx >= 0 ? focusedIdx : 0].dataset.value),
            Escape: () => toggle(false),
        };
        const listActions = {
            ArrowDown: () => updateFocus(focusedIdx + 1),
            ArrowUp: () => { if (searchable && focusedIdx === 0) setFocus("search"); else updateFocus(focusedIdx - 1); },
            Tab: (ev) => updateFocus(ev.shiftKey ? focusedIdx - 1 : focusedIdx + 1),
            Enter: select, " ": select, Escape: () => toggle(false),
        };

        const actionMap = isInput ? inputActions : (isList ? listActions : {});
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
    const toggle = (force) => {
        state.open = force ?? !state.open;
        toggleClass(menuContainer, "hidden", !state.open);
        const method = state.open ? "addEventListener" : "removeEventListener";
        document[method]("click", clickOutside, true);
        menuContainer[method]("keydown", handleKeyDown);

        if (state.open) {
            document.body.appendChild(menuContainer);
            positionElement(menuContainer, button);
            menuContainer.focus();
            render(searchable ? (input.value = "") : "");
            const list = menu.children;
            const initialIdx = Array.from(list).findIndex(li => li.dataset.value == state.value);
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
            if (menu.children[focusedIdx]) removeClass(menu.children[focusedIdx], focusClasses);
            focusedIdx = -1;
        }
    };

    button.addEventListener("click", () => toggle());
    menu.addEventListener("click", (e) => {
        const li = e.target.closest("li[data-value]");
        if (li) updateValue(li.dataset.value);
    });
    if (searchable && input) {
        input.addEventListener("input", () => render(input.value));
        input.addEventListener("click", (e) => e.stopPropagation());
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
            document.removeEventListener("click", clickOutside, true);
            selectEl.removeEventListener("keydown", handleKeyDown);
            selectEl.remove();
            state = null;
        },
    };
}
