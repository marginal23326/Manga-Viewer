import { getCurrentManga } from "../core/MangaLibrary";
import { resetScrollAndLoadChapter } from "./ImageManager";

// Called by the CustomSelect's onChange callback
export function jumpToChapter(selectedValue) {
    const manga = getCurrentManga();
    if (!manga) return;

    const selectedChapter = typeof selectedValue === "string" ? parseInt(selectedValue, 10) : selectedValue;

    if (
        selectedValue !== "" &&
        !isNaN(selectedChapter) &&
        selectedChapter >= 0 &&
        selectedChapter < manga.totalChapters
    ) {
        resetScrollAndLoadChapter(selectedChapter);
    } else if (selectedValue !== "") {
        console.warn("Invalid chapter selected:", selectedValue);
    }
}
