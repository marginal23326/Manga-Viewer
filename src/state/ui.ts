import { createState } from "@/core/create-state";

interface UIStateShape {
    isNavVisible: boolean;
    isSelectEnabled: boolean;
    selectedMangaIds: string[];
}

export const UIState = createState<UIStateShape>({
    isNavVisible: false,
    isSelectEnabled: false,
    selectedMangaIds: [],
});
