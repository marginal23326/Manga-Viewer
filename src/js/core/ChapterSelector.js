let chapterSelectorUpdater = null;

export function registerChapterSelectorUpdater(updater) {
    chapterSelectorUpdater = updater;
}

export function updateChapterSelectorOptions(totalChapters, currentChapter) {
    chapterSelectorUpdater?.(totalChapters, currentChapter);
}
