import Config from "./Config";

const defaultState = {
    isNavVisible: false,
    isAutoScrolling: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectModeEnabled: false,
    selectedMangaIds: [],
};

export const UIState = { ...defaultState };

UIState.update = function (key, value) {
    if (this[key] === value) return false;
    this[key] = value;
    return true;
};
