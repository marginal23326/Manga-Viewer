// Import all icons needed across the entire application
import {
    createIcons,
    PlusCircle,
    Pencil,
    Trash2,
    Menu,
    Home,
    Settings,
    ZoomIn,
    ZoomOut,
    Undo2,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    CircleCheck,
    Maximize,
    Minimize,
    X,
    Eye,
    EyeOff,
    Info,
    ChevronsUpDown,
    ChevronDown,
} from "lucide";

export const AppIcons = {
    PlusCircle,
    Pencil,
    Trash2,
    Menu,
    Home,
    Settings,
    ZoomIn,
    ZoomOut,
    Undo2,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight,
    CircleCheck,
    Maximize,
    Minimize,
    X,
    Eye,
    EyeOff,
    Info,
    ChevronsUpDown,
    ChevronDown,
};

/** Renders Lucide icons by scanning elements with data-lucide attributes */
export function renderIcons() {
    createIcons({ icons: AppIcons });
}
