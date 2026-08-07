import Config from "@/core/config";
import { createState } from "@/core/create-state";

interface UIStateShape {
    isAutoScrolling: boolean;
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    isSelectModeEnabled: boolean;
    selectedMangaIds: string[];
}

const defaultState: UIStateShape = {
    isAutoScrolling: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectModeEnabled: false,
    selectedMangaIds: [],
};

export const UIState = createState(defaultState);
