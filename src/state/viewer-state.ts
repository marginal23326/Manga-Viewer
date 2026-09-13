import { createState } from "@/core/create-state";

interface ViewerStateShape {
    imageRange: {
        end: number;
        start: number;
        total: number;
    };
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    imageRange: { end: 0, start: 0, total: 0 },
    visibleImageIndex: 0,
});
