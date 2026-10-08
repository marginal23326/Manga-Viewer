import { ViewerState, getCurrentManga } from "@/state";
import { navigateTo, parseRoute } from "./hash-route";

export function goToChapter(chapterIndex: number): void {
    const manga = getCurrentManga();
    if (!manga || chapterIndex < 0 || chapterIndex >= manga.totalChapters) return;
    navigateTo({ chapterIndex, id: manga.id, name: "manga" });
}

// Read the route, not progress: progress only advances once a chapter finishes loading,
// so rapid presses would otherwise repeat the same step.
function currentAddressChapter(): number {
    const route = parseRoute(location.hash);
    if (route.name === "manga" && route.chapterIndex !== undefined) return route.chapterIndex;
    return ViewerState.session?.progress.currentChapter ?? 0;
}

export function loadNextChapter(): void {
    goToChapter(currentAddressChapter() + 1);
}

export function loadPreviousChapter(): void {
    goToChapter(currentAddressChapter() - 1);
}

export function goToLastChapter(): void {
    const manga = getCurrentManga();
    if (manga) goToChapter(manga.totalChapters - 1);
}
