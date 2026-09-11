import { debounce } from "./utils";

const HOVER_REVEAL_SHOW_DELAY_MS = 20;
const HOVER_REVEAL_HIDE_DELAY_MS = 100;

export function observeHoverReveal(
    shouldReveal: (e: MouseEvent) => boolean,
    onShow: () => void,
    onHide: () => void,
): void {
    const scheduleShow = debounce(onShow, HOVER_REVEAL_SHOW_DELAY_MS);
    const scheduleHide = debounce(onHide, HOVER_REVEAL_HIDE_DELAY_MS);
    document.addEventListener("mousemove", (e) => {
        if (shouldReveal(e)) {
            scheduleHide.cancel();
            scheduleShow();
        } else {
            scheduleShow.cancel();
            scheduleHide();
        }
    });
}
