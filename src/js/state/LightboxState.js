import { createState } from "../core/createState";

const defaultState = {
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
