import Config from "./config";
import { debounce } from "./utils";

export function observeHoverReveal(
    shouldReveal: (e: MouseEvent) => boolean,
    onShow: () => void,
    onHide: () => void,
): void {
    const scheduleShow = debounce(onShow, Config.HOVER_REVEAL_SHOW_DELAY_MS);
    const scheduleHide = debounce(onHide, Config.HOVER_REVEAL_HIDE_DELAY_MS);
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
