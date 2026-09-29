import type { AutoScrollStatus, ChapterContext } from "@/types";
import { createState } from "@/core/create-state";

interface ViewerStateShape {
    activeChapter: ChapterContext | null;
    autoScroll: AutoScrollStatus;
    currentMangaId: string | null;
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    activeChapter: null,
    autoScroll: "off",
    currentMangaId: null,
    visibleImageIndex: 0,
});
