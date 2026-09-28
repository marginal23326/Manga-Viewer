import { createState } from "@/core/create-state";

interface UIStateShape {
    isNavVisible: boolean;
    selectedMangaIds: string[] | null;
}

export const UIState = createState<UIStateShape>({
    isNavVisible: false,
    selectedMangaIds: null,
});
