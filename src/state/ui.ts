import Config from "@/core/config";

interface UIStateShape {
    isAutoScrolling: boolean;
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    isSelectModeEnabled: boolean;
    selectedMangaIds: string[];
}

export const UIState: UIStateShape = {
    isAutoScrolling: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectModeEnabled: false,
    selectedMangaIds: [],
};
