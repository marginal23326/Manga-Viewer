import { CurrentProgress, PersistState } from "@/state";
import { debounce } from "@/core/utils";
import { getActiveScrollAnchor } from "./virtualizer";

export function saveCurrentScrollPosition(): void {
    const anchor = getActiveScrollAnchor();
    if (!anchor) return;

    CurrentProgress.update("scrollIndex", anchor.index);
    CurrentProgress.update("scrollOffset", anchor.offset);
}

const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

function handleScroll(): void {
    if (PersistState.currentView === "viewer") {
        debouncedSaveScroll();
    }
}

export function initScrollPosition(): void {
    addEventListener("scroll", handleScroll, { passive: true });
    addEventListener("pagehide", saveCurrentScrollPosition, { capture: true });
}
