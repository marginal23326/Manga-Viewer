import { createState } from "@/core/create-state";

interface UIStateShape {
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    isSelectEnabled: boolean;
    selectedMangaIds: string[];
}

export const UIState = createState<UIStateShape>({
    isNavVisible: false,
    isPasswordVerified: !(import.meta.env.VITE_PASSWORD || ""),
    isSelectEnabled: false,
    selectedMangaIds: [],
});
