import Config from "@/core/config";
import type { ThemePreference } from "@/types";
import { createState } from "@/core/create-state";

export interface SelectionState {
    isSelectEnabled: boolean;
    selectedMangaIds: string[];
}

interface UIStateShape {
    isAutoScrolling: boolean;
    isModalOpen: boolean;
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    selection: SelectionState;
    themePreference: ThemePreference;
}

export const UIState = createState<UIStateShape>({
    isAutoScrolling: false,
    isModalOpen: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    selection: { isSelectEnabled: false, selectedMangaIds: [] },
    themePreference: "system",
});
