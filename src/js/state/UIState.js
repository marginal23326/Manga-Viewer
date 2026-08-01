import Config from "../core/Config";
import { createState } from "../core/createState";

const defaultState = {
    isAutoScrolling: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectModeEnabled: false,
    selectedMangaIds: [],
};

export const UIState = createState(defaultState);
