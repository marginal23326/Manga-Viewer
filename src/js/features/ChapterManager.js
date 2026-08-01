import { withCurrentManga } from "../core/MangaLibrary";
import { resetScrollAndLoadChapter } from "./ImageManager";

// Called by the CustomSelect's onChange callback
export function jumpToChapter(selectedValue) {
    return withCurrentManga((manga) => {
        if (
            selectedValue !== "" &&
            selectedValue >= 0 &&
            selectedValue < manga.totalChapters
        ) {
            resetScrollAndLoadChapter(selectedValue);
        } else if (selectedValue !== "") {
            console.warn("Invalid chapter selected:", selectedValue);
        }
    });
}
