import Config from "@/core/config";
import { createState } from "@/core/create-state";

interface UIStateShape {
    isModalOpen: boolean;
    isNavVisible: boolean;
    isPasswordVerified: boolean;
    selection: {
        isSelectEnabled: boolean;
        selectedMangaIds: string[];
    };
}

export const UIState = createState<UIStateShape>({
    isModalOpen: false,
    isNavVisible: false,
    isPasswordVerified: !Config.PASSWORD,
    selection: { isSelectEnabled: false, selectedMangaIds: [] },
});
