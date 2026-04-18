import { DOM } from "./DOMUtils";
import { getCurrentManga } from "./MangaLibrary";
import { getSettings, updateSettings } from "./MangaSettings";
import { debounce, scrollToView } from "./Utils";

export function saveCurrentScrollPosition() {
    const manga = getCurrentManga();
    if (!manga) return;
    if (DOM.imageContainer && DOM.imageContainer.children.length === 0) return;

    updateSettings(manga.id, { scrollPosition: window.scrollY || document.documentElement.scrollTop });
}

export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

export function restoreSavedScrollPosition({ onComplete } = {}) {
    const manga = getCurrentManga();
    if (!manga) {
        onComplete?.();
        return;
    }

    const settings = getSettings(manga.id);
    const targetPosition = settings.scrollPosition || 0;

    let ended = false;
    const completeRestore = () => {
        if (ended) return;
        ended = true;
        onComplete?.();
        window.removeEventListener("scrollend", completeRestore);
    };

    requestAnimationFrame(() => {
        if ("scrollBehavior" in document.documentElement.style) {
            window.addEventListener("scrollend", completeRestore, { once: true });
            window.scrollTo({ top: targetPosition, behavior: "smooth" });

            // Fallback for browsers that might not fire scrollend properly.
            if (window.scrollY === targetPosition) {
                completeRestore();
            }
        } else {
            window.scrollTo(0, targetPosition);
            completeRestore();
        }
    });
}

export function scrollToImage(imageIndex) {
    if (!DOM.imageContainer) return;
    const images = Array.from(DOM.imageContainer.querySelectorAll("img.manga-image"));
    const targetImage = images[imageIndex];
    if (targetImage) {
        scrollToView(targetImage);
    }
}
