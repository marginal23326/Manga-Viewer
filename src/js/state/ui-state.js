import Config from "../core/config";
import { createState } from "../core/create-state";

const defaultState = {
    isAutoScrolling: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectModeEnabled: false,
    selectedMangaIds: [],
};

export const UIState = createState(defaultState);
