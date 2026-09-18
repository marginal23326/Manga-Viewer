// Import all icons needed across the entire application
import {
    Check,
    CheckSquare,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    EyeOff,
    FlipHorizontal2,
    Home,
    Laptop,
    Library,
    Moon,
    PanelLeft,
    PanelLeftOpen,
    Pencil,
    Plus,
    RotateCw,
    Search,
    Settings,
    Sun,
    Trash2,
    Undo2,
    X,
    XSquare,
    ZoomIn,
    ZoomOut,
    createElement,
} from "lucide";
import { h } from "./dom-utils";

const AppIcons = {
    Check,
    CheckSquare,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Eye,
    EyeOff,
    FlipHorizontal2,
    Home,
    Laptop,
    Library,
    Moon,
    PanelLeft,
    PanelLeftOpen,
    Pencil,
    Plus,
    RotateCw,
    Search,
    Settings,
    Sun,
    Trash2,
    Undo2,
    X,
    XSquare,
    ZoomIn,
    ZoomOut,
} as const;

export type IconName = keyof typeof AppIcons;

export interface Option<V extends string = string> {
    icon?: IconName;
    text: string;
    value: V;
}

export interface IconSvgOptions {
    className?: string;
    size?: number;
    strokeWidth?: number;
}

export function iconSvg(name: IconName, { className, size = 24, strokeWidth = 2 }: IconSvgOptions = {}): SVGElement {
    return createElement(AppIcons[name], {
        "aria-hidden": "true",
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
    { className = "", iconOptions, onClick, stopPropagation = false, tooltip }: IconButtonOptions = {},
): HTMLButtonElement {
    const icon = iconSvg(name, iconOptions);
    const button = h("button", { className, title: tooltip }, icon);
    if (onClick) {
        button.addEventListener("click", (event) => {
            if (stopPropagation) event.stopPropagation();
            onClick();
            (event.currentTarget as HTMLElement).blur();
        });
    }
    return button;
}
