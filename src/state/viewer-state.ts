import type { ChapterContext } from "@/types";
import { createState } from "@/core/create-state";

interface ViewerStateShape {
    activeChapter: ChapterContext | null;
    imageRange: {
        end: number;
        start: number;
        total: number;
    };
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    activeChapter: null,
    imageRange: { end: 0, start: 0, total: 0 },
    visibleImageIndex: 0,
});
