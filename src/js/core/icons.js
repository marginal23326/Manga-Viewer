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

export const AppIcons = {
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
};

export function iconSvg(name, { size = 24, strokeWidth = 3, className } = {}) {
    return createElement(AppIcons[name], {
        "aria-hidden": "true",
        ...(className && { class: className }),
        height: size,
        "stroke-width": String(strokeWidth),
        width: size,
    });
}

export function createIconButton(name, { className = "", iconClassName, id, onClick, tooltip } = {}) {
    const icon = iconSvg(name, { className: iconClassName });
    const button = h("button", { className, id, title: tooltip }, icon);
    if (onClick) {
        button.addEventListener("click", (event) => {
            onClick();
            event.currentTarget.blur();
        });
    }
    return button;
}
