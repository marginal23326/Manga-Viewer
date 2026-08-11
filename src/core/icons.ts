// Import all icons needed across the entire application
import {
    Check,
    CheckSquare,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronsUpDown,
    CircleCheck,
    Database,
    Eye,
    EyeOff,
    HelpCircle,
    Home,
    Info,
    Laptop,
    Maximize,
    Menu,
    Minimize,
    Moon,
    PanelLeft,
    PanelLeftClose,
    PanelLeftOpen,
    Pencil,
    Plus,
    PlusCircle,
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
    ChevronsUpDown,
    CircleCheck,
    Database,
    Eye,
    EyeOff,
    HelpCircle,
    Home,
    Info,
    Laptop,
    Maximize,
    Menu,
    Minimize,
    Moon,
    PanelLeft,
    PanelLeftClose,
    PanelLeftOpen,
    Pencil,
    Plus,
    PlusCircle,
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

export interface IconSvgOptions {
    className?: string;
    size?: number;
    strokeWidth?: number;
}

export function iconSvg(name: IconName, { className, size = 24, strokeWidth = 3 }: IconSvgOptions = {}): SVGElement {
    return createElement(AppIcons[name], {
        "aria-hidden": "true",
        ...(className && { class: className }),
        height: size,
        "stroke-width": String(strokeWidth),
        width: size,
    });
}

export function setIcon(button: HTMLElement, name: IconName, options?: IconSvgOptions): void {
    button.innerHTML = "";
    button.append(iconSvg(name, options));
}

export interface IconButtonOptions {
    className?: string;
    id?: string;
    onClick?: () => void;
    tooltip?: string;
}

export function createIconButton(
    name: IconName,
    { className = "", id, onClick, tooltip }: IconButtonOptions = {},
): HTMLButtonElement {
    const icon = iconSvg(name);
    const button = h("button", { className, id, title: tooltip }, icon);
    if (onClick) {
        button.addEventListener("click", (event) => {
            onClick();
            (event.currentTarget as HTMLElement).blur();
        });
    }
    return button;
}
