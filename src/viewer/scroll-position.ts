import { debounce } from "@/core/utils";
import { emitAppEvent } from "@/core/app-events";
import { getActiveScrollAnchor } from "./virtualizer";
import { updateCurrentSettings } from "@/state";

export function saveCurrentScrollPosition(): void {
    const anchor = getActiveScrollAnchor();
    if (!anchor) return;

    updateCurrentSettings({ scrollIndex: anchor.index, scrollOffset: anchor.offset });
}

export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

window.addEventListener("scroll", () => emitAppEvent("viewerScroll"), { passive: true });
