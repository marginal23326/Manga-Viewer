import { $$, h } from "@/core/dom-utils";
import { type IconName, iconSvg } from "@/core/icons";
import type { ThemePreference } from "@/types";

const BUTTON_BASE_CLASSES =
    "inline-flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-medium calm-transition focus-ring";

const BUTTON_INACTIVE_CLASSES =
    "bg-transparent text-ink/60 dark:text-paper/55 hover:bg-ink/[0.05] dark:hover:bg-white/[0.06] hover:text-ink dark:hover:text-paper cursor-pointer";

const BUTTON_ACTIVE_CLASSES = "bg-accent text-white dark:bg-accent-light cursor-default pointer-events-none";

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

/** Creates and manages a segmented set of theme selection buttons. */
export function createThemeButtons({ container, items, onChange, value }: ThemeButtonsOptions): ThemeButtonsInstance {
    const componentElement = h("div", {
        className: "inline-flex flex-wrap gap-1 p-1 rounded-full surface",
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
        const iconEl = iconSvg(item.icon, { className: "mr-2", size: 16, strokeWidth: 2 });
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
        container.replaceChildren();
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
