import { createState } from "../core/createState";

const defaultState = {
    isOpen: false,
    currentImageIndex: -1,
    isDragging: false,
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
    currentTranslateX: 0,
    currentTranslateY: 0,
    currentScale: 1,
};

export const LightboxState = createState(defaultState);
