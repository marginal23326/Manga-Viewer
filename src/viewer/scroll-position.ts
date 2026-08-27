import { CurrentSettings } from "@/state";
import { debounce } from "@/core/utils";
import { emitAppEvent } from "@/core/app-events";
import { getActiveScrollAnchor } from "./virtualizer";

export function saveCurrentScrollPosition(): void {
    const anchor = getActiveScrollAnchor();
    if (!anchor) return;

    CurrentSettings.update("scrollIndex", anchor.index);
    CurrentSettings.update("scrollOffset", anchor.offset);
}

export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

window.addEventListener("pagehide", saveCurrentScrollPosition, { capture: true });
window.addEventListener("scroll", () => emitAppEvent("viewerScroll"), { passive: true });
