import { addClass, toggleClass, setDataAttribute, setText, $$ } from "../core/DOMUtils";

const BUTTON_BASE_CLASSES = "inline-flex items-center justify-center p-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800";
const BUTTON_INACTIVE_CLASSES = "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600";
const BUTTON_ACTIVE_CLASSES = "bg-blue-600 text-white border-blue-700 focus:ring-blue-500";

/**
 * Creates and manages a set of theme selection buttons.
 * @param {object} options
 * @param {HTMLElement} options.container - The element to render the buttons into.
 * @param {Array<{value: 'light' | 'dark' | 'system', text: string, icon: string}>} options.items - The theme options.
 * @param {'light' | 'dark' | 'system'} options.value - The currently selected theme value.
 * @param {(value: 'light' | 'dark' | 'system') => void} options.onChange - Callback when a button is clicked.
 */
export function createThemeButtons({ container, items, value, onChange }) {
    const componentElement = document.createElement("div");
    addClass(componentElement, "flex items-center space-x-2");
    setDataAttribute(componentElement, "themeButtonsContainer", "true");

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

    items.forEach(item => {
        const button = document.createElement("button");
        button.type = "button";
        addClass(button, BUTTON_BASE_CLASSES);
        setDataAttribute(button, "value", item.value);

        const iconEl = document.createElement("i");
        setDataAttribute(iconEl, "lucide", item.icon);
        addClass(iconEl, "mr-2");

        const textEl = document.createElement("span");
        setText(textEl, item.text);

        button.appendChild(iconEl);
        button.appendChild(textEl);
        componentElement.appendChild(button);

        button.addEventListener("click", handleClick);
    });

    function updateButtons() {
        $$("button", componentElement).forEach(button => {
            const isActive = button.dataset.value === currentValue;
            toggleClass(button, BUTTON_ACTIVE_CLASSES, isActive);
            toggleClass(button, BUTTON_INACTIVE_CLASSES, !isActive);
        });
    }

    function setValue(newValue) {
        currentValue = newValue;
        updateButtons();
    }

    function destroy() {
        $$("button", componentElement).forEach(button => {
            button.removeEventListener("click", handleClick);
        });
        container.innerHTML = "";
    }

    // Initial setup
    container.appendChild(componentElement);
    setValue(currentValue);

    return {
        element: componentElement,
        setValue,
        getValue: () => currentValue,
        destroy,
    };
}
