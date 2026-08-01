import { $$, h } from "../core/DOMUtils";

const BUTTON_BASE_CLASSES =
    "inline-flex flex-1 sm:flex-none items-center justify-center px-4 py-3 brutal-border font-space font-bold uppercase tracking-widest text-sm transition-all duration-150 focus:outline-none";

// Inactive: Pops out, drops a harsh shadow, moves on hover.
const BUTTON_INACTIVE_CLASSES =
    "bg-paper dark:bg-ink text-black dark:text-white brutal-shadow hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_0_#FF3366] dark:hover:shadow-[6px_6px_0_0_#FF3366] active:translate-y-0 active:translate-x-0 active:shadow-none cursor-pointer";

// Active: Sunken in, pure accent color, no outer shadow.
const BUTTON_ACTIVE_CLASSES =
    "bg-[#FF3366] !text-white !border-[#FF3366] shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.2)] dark:shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.4)] translate-y-0 translate-x-0 cursor-default pointer-events-none";

/**
 * Creates and manages a brutalist set of theme selection buttons.
 * @param {object} options
 * @param {HTMLElement} options.container - The element to render the buttons into.
 * @param {Array<{value: 'light' | 'dark' | 'system', text: string, icon: string}>} options.items - The theme options.
 * @param {'light' | 'dark' | 'system'} options.value - The currently selected theme value.
 * @param {(value: 'light' | 'dark' | 'system') => void} options.onChange - Callback when a button is clicked.
 */
export function createThemeButtons({ container, items, value, onChange }) {
    const componentElement = h("div", {
        className: "flex flex-wrap gap-3 sm:gap-4 w-full sm:w-auto",
        dataset: { themeButtonsContainer: "true" },
    });

    let currentValue = value;

    const handleClick = (e) => {
        const button = e.currentTarget;
        const newValue = button.dataset.value;
        if (newValue !== currentValue) {
            setValue(newValue);
            if (onChange) {
                onChange(newValue);
            }
        }
        button.blur();
    };

    items.forEach((item) => {
        const iconEl = h("i", {
            className: "mr-3",
            "data-lucide": item.icon,
            height: "20",
            "stroke-width": "3",
            width: "20",
        });
        const textEl = h("span", {}, item.text);

        const button = h(
            "button",
            {
                dataset: { value: item.value },
                type: "button",
            },
            iconEl,
            textEl,
        );

        button.addEventListener("click", handleClick);
        componentElement.append(button);
    });

    function updateButtons() {
        $$("button", componentElement).forEach((button) => {
            const isActive = button.dataset.value === currentValue;
            button.className = `${BUTTON_BASE_CLASSES} ${isActive ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`;
        });
    }

    function setValue(newValue) {
        currentValue = newValue;
        updateButtons();
    }

    function destroy() {
        $$("button", componentElement).forEach((button) => {
            button.removeEventListener("click", handleClick);
        });
        container.innerHTML = "";
    }

    container.append(componentElement);
    setValue(currentValue);

    return {
        destroy,
        element: componentElement,
        getValue: () => currentValue,
        setValue,
    };
}
