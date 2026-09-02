import { CurrentProgress } from "@/state";
import { debounce } from "@/core/utils";
import { getActiveScrollAnchor } from "./virtualizer";

export function saveCurrentScrollPosition(): void {
    const anchor = getActiveScrollAnchor();
    if (!anchor) return;

    CurrentProgress.update("scrollIndex", anchor.index);
    CurrentProgress.update("scrollOffset", anchor.offset);
}

export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

addEventListener("pagehide", saveCurrentScrollPosition, { capture: true });
