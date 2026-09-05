import { createAbortScope, debounce } from "./utils";
import Config from "./config";

export function createHoverReveal(
    shouldReveal: (e: MouseEvent) => boolean,
    onShow: () => void,
    onHide: () => void,
): { activate: () => void; deactivate: () => void } {
    const controller = createAbortScope();
    const scheduleShow = debounce(onShow, Config.HOVER_REVEAL_SHOW_DELAY_MS);
    const scheduleHide = debounce(onHide, Config.HOVER_REVEAL_HIDE_DELAY_MS);
    const handleMouseMove = (e: MouseEvent): void => {
        if (shouldReveal(e)) {
            scheduleHide.cancel();
            scheduleShow();
        } else {
            scheduleShow.cancel();
            scheduleHide();
        }
    };
    return {
        activate(): void {
            const signal = controller.renew();
            document.addEventListener("mousemove", handleMouseMove, { signal });
        },
        deactivate(): void {
            controller.abort();
            scheduleShow.cancel();
            scheduleHide.cancel();
        },
    };
}
