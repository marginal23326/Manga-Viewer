import { $$, DOM } from "./DOMUtils";
import { withCurrentManga } from "./MangaLibrary";
import { getSettings, updateSettings } from "./MangaSettings";
import { debounce, scrollToView } from "./Utils";

export function saveCurrentScrollPosition() {
    return withCurrentManga((manga) => {
        if (DOM.imageContainer && DOM.imageContainer.children.length === 0) return;

        updateSettings(manga.id, { scrollPosition: window.scrollY || document.documentElement.scrollTop });
    });
}

export const debouncedSaveScroll = debounce(saveCurrentScrollPosition, 300);

export function restoreSavedScrollPosition({ onComplete } = {}) {
    return withCurrentManga(
        (manga) => {
            const settings = getSettings(manga.id);
            const targetPosition = settings.scrollPosition || 0;

            let ended = false;
            const completeRestore = () => {
                if (ended) return;
                ended = true;
                onComplete?.();
            };

            requestAnimationFrame(() => {
                if ("scrollBehavior" in document.documentElement.style) {
                    window.addEventListener("scrollend", completeRestore, { once: true });
                    window.scrollTo({ top: targetPosition, behavior: "smooth" });

                    // Fallback for browsers that might not fire scrollend properly.
                    if (window.scrollY === targetPosition) {
                        window.removeEventListener("scrollend", completeRestore);
                        completeRestore();
                    }
                } else {
                    window.scrollTo(0, targetPosition);
                    completeRestore();
                }
            });
        },
        () => {
            onComplete?.();
        },
    );
}

export function scrollToImage(imageIndex) {
    if (!DOM.imageContainer) return;
    const images = $$("img.manga-image", DOM.imageContainer);
    const targetImage = images[imageIndex];
    if (targetImage) {
        scrollToView(targetImage);
    }
}
