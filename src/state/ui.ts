import { createState } from "@/core/create-state";

interface UIStateShape {
    selectedMangaIds: string[] | null;
}

export const UIState = createState<UIStateShape>({
    selectedMangaIds: null,
});
