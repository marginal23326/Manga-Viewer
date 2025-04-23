import { addClass, removeClass, toggleClass } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { scrollToView } from "../core/Utils";

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
    } = options;

    const selectEl = document.createElement("div");
    selectEl.id = id;
    selectEl.className = "relative";

    selectEl.innerHTML = `
    <button type="button" class="select-btn relative ${width} cursor-default rounded-md bg-white dark:bg-gray-800 py-1.5 pl-3 pr-10 text-left text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm sm:leading-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-75">
      <span class="select-text block truncate"></span>
      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
        <i data-lucide="chevron-down" width="16" height="16" class="text-gray-400"></i>
      </span>
    </button>
    <ul class="select-menu absolute z-10 mt-1 max-h-60 ${width} overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm hidden no-scrollbar" tabindex="-1"></ul>
  `;

    const button = selectEl.querySelector(".select-btn");
    const text = selectEl.querySelector(".select-text");
    const menu = selectEl.querySelector(".select-menu");
    let state = { items, value, open: false };
    let isInitializing = true;
    let focusedIndex = -1; // Tracks KEYBOARD focus index
    const keyboardFocusClasses = "bg-blue-100 dark:bg-blue-600/50";

    const updateUI = () => {
        const item = state.items.find((i) => i.value == state.value);
        text.textContent = item ? item.text : placeholder;

        menu.innerHTML = state.items.map((item) => {
            const isSelected = item.value == state.value;
            return `
        <li data-value="${item.value}" class="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 dark:text-gray-100 hover:bg-blue-100 dark:hover:bg-blue-600/50">
          <span class="block truncate ${isSelected ? 'font-semibold' : ""}">${item.text}</span>
          ${isSelected ? `<span class="absolute inset-y-0 right-0 flex items-center pr-2">
              <i data-lucide="circle-check" class="h-5 w-5 text-blue-600 dark:text-blue-400"></i>
            </span>` : ""}
        </li>`;
        }).join("");
        renderIcons();
    };

    // Manages focusedIndex and applies keyboard focus style
    const updateFocus = (newIndex) => {
        const items = menu.children;
        const n = items.length;
        if (n === 0) return;

        const prev = items[focusedIndex];
        if (prev) removeClass(prev, keyboardFocusClasses);

        focusedIndex = ((newIndex % n) + n) % n;

        const focusedItem = items[focusedIndex];
        addClass(focusedItem, keyboardFocusClasses);
        scrollToView(focusedItem, "instant");
    };


    const toggleMenu = (force) => {
        state.open = force ?? !state.open;
        toggleClass(menu, "hidden", !state.open);
        const method = state.open ? "addEventListener" : "removeEventListener";
        document[method]("click", clickOutside, true);
        selectEl[method]("keydown", handleKeyDown);

        if (state.open) {
            const initialIndex = state.items.findIndex((item) => item.value == state.value);
            updateFocus(initialIndex !== -1 ? initialIndex : 0);
        } else {
            const prev = menu.children[focusedIndex];
            if (prev) removeClass(prev, keyboardFocusClasses);

            focusedIndex = -1;
            button.blur();
        }
    };

    const handleKeyDown = (event) => {
        if (!state.open) return;

        const items = menu.children;
        const selectAtFocused = () => {
            if (focusedIndex >= 0 && focusedIndex < items.length) {
                updateValue(items[focusedIndex].dataset.value);
            }
        };

        const keyActions = {
            Escape: () => toggleMenu(false),
            ArrowDown: () => updateFocus(focusedIndex + 1),
            ArrowUp: () => updateFocus(focusedIndex - 1),
            Tab: () => updateFocus(event.shiftKey ? focusedIndex - 1 : focusedIndex + 1),
            Enter: selectAtFocused,
            " ": selectAtFocused,
        };

        const action = keyActions[event.key];
        if (action) {
            event.preventDefault();
            event.stopPropagation();
            action();
        }
    };

    const updateValue = (newValue, suppressOnChange = false) => {
        const exists = state.items.some((i) => i.value == newValue);
        const actualNewValue = exists ? newValue : null;
        const valueChanged = state.value != actualNewValue; // Use (!=) to allow type coercion

        state.value = actualNewValue;
        updateUI();
        if (valueChanged && !suppressOnChange && !isInitializing) {
            onChange(state.value);
        }

        if (state.open) {
            toggleMenu(false);
            button.focus();
        }
    };

    const handleMenuClick = (event) => {
        const li = event.target.closest("li[data-value]");
        if (li) {
            updateValue(li.dataset.value);
        }
    };

    const clickOutside = (event) => {
        if (!button.contains(event.target) && !menu.contains(event.target)) {
            toggleMenu(false);
        }
    };

    button.addEventListener("click", () => toggleMenu());
    menu.addEventListener("click", handleMenuClick);
    updateUI();

    setTimeout(() => { isInitializing = false; }, 0);

    if (container) {
        container[appendTo ? "appendChild" : "replaceWith"](selectEl);
    }

    return {
        element: selectEl,
        getValue: () => state.value,
        setValue: (newValue) => updateValue(newValue, true),
        setOptions: (newItems, newValue = null) => {
            state.items = [...newItems];
            updateValue(newValue, true);
            focusedIndex = -1;
        },
        isOpen: () => state.open,
        destroy: () => {
            document.removeEventListener("click", clickOutside, true);
            selectEl.removeEventListener("keydown", handleKeyDown);
            menu.removeEventListener("click", handleMenuClick);
            selectEl.remove();
            state = null;
        },
    };
}
