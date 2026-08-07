import { $$, h } from "@/core/dom-utils";
import { type IconName, iconSvg } from "@/core/icons";
import type { ThemePreference } from "@/types";

const BUTTON_BASE_CLASSES =
    "inline-flex flex-1 sm:flex-none items-center justify-center px-4 py-3 brutal-border font-space font-bold uppercase tracking-widest text-sm transition-all duration-150 focus:outline-none";

// Inactive: Pops out, drops a harsh shadow, moves on hover.
const BUTTON_INACTIVE_CLASSES =
    "bg-paper dark:bg-ink text-black dark:text-white brutal-shadow hover:-translate-y-1 hover:-translate-x-1 hover:brutal-shadow-lg-accent active:translate-y-0 active:translate-x-0 active:shadow-none cursor-pointer";

// Active: Sunken in, pure accent color, no outer shadow.
const BUTTON_ACTIVE_CLASSES =
    "bg-accent !text-white !border-accent shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.2)] dark:shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.4)] translate-y-0 translate-x-0 cursor-default pointer-events-none";

export interface ThemeButtonItem {
    icon: IconName;
    text: string;
    value: ThemePreference;
}

export interface ThemeButtonsOptions {
    container: Element;
    items: ThemeButtonItem[];
    onChange?: (value: ThemePreference) => void;
    value: ThemePreference;
}

export interface ThemeButtonsInstance {
    destroy: () => void;
    element: HTMLDivElement;
    getValue: () => ThemePreference;
    setValue: (newValue: ThemePreference) => void;
}

/** Creates and manages a brutalist set of theme selection buttons. */
export function createThemeButtons({ container, items, onChange, value }: ThemeButtonsOptions): ThemeButtonsInstance {
    const componentElement = h("div", {
        className: "flex flex-wrap gap-3 sm:gap-4 w-full sm:w-auto",
        dataset: { themeButtonsContainer: "true" },
    });

    let currentValue = value;

    const handleClick = (event: MouseEvent): void => {
        const button = event.currentTarget as HTMLButtonElement;
        const newValue = button.dataset.value as ThemePreference | undefined;
        if (newValue && newValue !== currentValue) {
            setValue(newValue);
            onChange?.(newValue);
        }
        button.blur();
    };

    items.forEach((item) => {
        const iconEl = iconSvg(item.icon, { className: "mr-3", size: 20 });
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

    function updateButtons(): void {
        for (const button of $$<HTMLButtonElement>("button", componentElement)) {
            const isActive = button.dataset.value === currentValue;
            button.className = `${BUTTON_BASE_CLASSES} ${isActive ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`;
        }
    }

    function setValue(newValue: ThemePreference): void {
        currentValue = newValue;
        updateButtons();
    }

    function destroy(): void {
        for (const button of $$<HTMLButtonElement>("button", componentElement)) {
            button.removeEventListener("click", handleClick);
        }
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
