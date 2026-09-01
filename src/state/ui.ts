import Config from "@/core/config";
import { createState } from "@/core/create-state";

export interface SelectionState {
    isSelectEnabled: boolean;
    selectedMangaIds: string[];
}

interface UIStateShape {
    isAutoScrolling: boolean;
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    selection: SelectionState;
}

export const UIState = createState<UIStateShape>({
    isAutoScrolling: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    selection: { isSelectEnabled: false, selectedMangaIds: [] },
});
