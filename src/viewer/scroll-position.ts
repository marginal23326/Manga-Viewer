import { debounce, getMangaImages, scrollToView } from "@/core/utils";
import { getSettings, updateSettings } from "@/state/manga-settings";
import { DOM } from "@/core/dom-utils";
import { getCurrentManga } from "@/state/manga-library";

export function saveCurrentScrollPosition(): void {
    const manga = getCurrentManga();
    if (!manga) return;
    if (DOM.imageContainer && DOM.imageContainer.children.length === 0) return;

    updateSettings(manga.id, { scrollPosition: window.scrollY || document.documentElement.scrollTop });
}

export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

export interface RestoreScrollOptions {
    onComplete?: () => void;
}

export function restoreSavedScrollPosition({ onComplete }: RestoreScrollOptions = {}): void {
    const manga = getCurrentManga();
    if (!manga) {
        onComplete?.();
        return;
    }

    const settings = getSettings(manga.id);
    const targetPosition = settings.scrollPosition ?? 0;

    let ended = false;
    const completeRestore = (): void => {
        if (ended) return;
        ended = true;
        onComplete?.();
    };

    requestAnimationFrame(() => {
        window.addEventListener("scrollend", completeRestore, { once: true });
        window.scrollTo({ behavior: "smooth", top: targetPosition });

        if (window.scrollY === targetPosition) {
            window.removeEventListener("scrollend", completeRestore);
            completeRestore();
        }
    });
}

export function scrollToImage(imageIndex: number): void {
    const targetImage = getMangaImages()[imageIndex];
    if (targetImage) {
        scrollToView(targetImage);
    }
}
