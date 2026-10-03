// Import all icons needed across the entire application
import {
    ArrowLeft,
    BookOpen,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    FlipHorizontal2,
    Laptop,
    ListChecks,
    Minus,
    Moon,
    Pause,
    Pencil,
    Pin,
    PinOff,
    Play,
    Plus,
    RotateCw,
    Search,
    Settings,
    SlidersHorizontal,
    Sun,
    Trash2,
    Undo2,
    X,
    ZoomIn,
    ZoomOut,
    createElement,
} from "lucide";
import { h } from "./dom-utils";

const AppIcons = {
    ArrowLeft,
    BookOpen,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    FlipHorizontal2,
    Laptop,
    ListChecks,
    Minus,
    Moon,
    Pause,
    Pencil,
    Pin,
    PinOff,
    Play,
    Plus,
    RotateCw,
    Search,
    Settings,
    SlidersHorizontal,
    Sun,
    Trash2,
    Undo2,
    X,
    ZoomIn,
    ZoomOut,
} as const;

export type IconName = keyof typeof AppIcons;

export interface IconSvgOptions {
    className?: string;
    size?: number;
    strokeWidth?: number;
}

export function iconSvg(name: IconName, { className, size = 24, strokeWidth = 2 }: IconSvgOptions = {}): SVGElement {
    return createElement(AppIcons[name], {
        ...(className && { class: className }),
        height: size,
        "stroke-width": String(strokeWidth),
        width: size,
    });
}

export function setIcon(button: HTMLElement, name: IconName, options?: IconSvgOptions): void {
    button.replaceChildren(iconSvg(name, options));
}

export interface IconButtonOptions {
    className?: string;
    iconOptions?: IconSvgOptions;
    onClick?: () => void;
    stopPropagation?: boolean;
    tooltip?: string;
}

export function createIconButton(
    name: IconName,
    { className = "btn-icon", iconOptions, onClick, stopPropagation = false, tooltip }: IconButtonOptions = {},
): HTMLButtonElement {
    const icon = iconSvg(name, iconOptions);
    const button = h("button", { className, title: tooltip, type: "button" }, icon);
    button.addEventListener("click", (event) => {
        if (stopPropagation) event.stopPropagation();
        onClick?.();
        (event.currentTarget as HTMLElement).blur();
    });
    return button;
}
