import Config from "@/core/config";
import { createState } from "@/core/create-state";

interface UIStateShape {
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    isSelectEnabled: boolean;
    selectedMangaIds: string[];
}

export const UIState = createState<UIStateShape>({
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    isSelectEnabled: false,
    selectedMangaIds: [],
});
