import Config from "./Config";
import { createState } from "./createState";

const defaultState = {
    isNavVisible: false,
    isAutoScrolling: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectModeEnabled: false,
    selectedMangaIds: [],
};

export const UIState = createState(defaultState);
