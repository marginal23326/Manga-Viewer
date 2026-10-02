import type { ChapterContext } from "@/types";
import { createState } from "@/core/create-state";

interface ViewerStateShape {
    activeChapter: ChapterContext | null;
    autoScroll: boolean;
    currentMangaId: string | null;
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    activeChapter: null,
    autoScroll: false,
    currentMangaId: null,
    visibleImageIndex: 0,
});
