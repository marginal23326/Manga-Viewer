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
    createIcons,
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

/** Renders Lucide icons by scanning elements with data-lucide attributes */
export function renderIcons() {
    createIcons({ icons: AppIcons });
}

export function iconPlaceholder(name, { className } = {}) {
    return h("i", { className, "data-lucide": name, height: "24", "stroke-width": "3", width: "24" });
}

export function createIconButton(name, { className = "", iconClassName, id, onClick, tooltip } = {}) {
    const icon = iconPlaceholder(name, { className: iconClassName });
    const button = h("button", { className, id, title: tooltip }, icon);
    if (onClick) {
        button.addEventListener("click", (event) => {
            onClick();
            event.currentTarget.blur();
        });
    }
    return button;
}
