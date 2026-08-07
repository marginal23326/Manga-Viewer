import { createState } from "@/core/create-state";

interface LightboxStateShape {
    currentImageIndex: number;
    currentScale: number;
    currentTranslateX: number;
    currentTranslateY: number;
    isDragging: boolean;
    isOpen: boolean;
    startTranslateX: number;
    startTranslateY: number;
    startX: number;
    startY: number;
}

const defaultState: LightboxStateShape = {
    currentImageIndex: -1,
    currentScale: 1,
    currentTranslateX: 0,
    currentTranslateY: 0,
    isDragging: false,
    isOpen: false,
    startTranslateX: 0,
    startTranslateY: 0,
    startX: 0,
    startY: 0,
};

export const LightboxState = createState(defaultState);
