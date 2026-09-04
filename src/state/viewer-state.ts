import { createState } from "@/core/create-state";

export interface ImageRange {
    end: number;
    start: number;
    total: number;
}

interface ViewerStateShape {
    imageRange: ImageRange;
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    imageRange: { end: 0, start: 0, total: 0 },
    visibleImageIndex: 0,
});
