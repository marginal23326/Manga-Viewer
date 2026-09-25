import { ViewerState } from "@/state";
import { clamp } from "@/core/utils";

export function totalPages(): number {
    return ViewerState.activeChapter?.pageCount ?? 0;
}

export function currentPageIndex(): number {
    const total = totalPages();
    if (total <= 0) return 0;
    return clamp(ViewerState.visibleImageIndex, 0, total - 1);
}

export function scrollProgress(): number {
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    if (scrollable <= 0) return 0;
    return clamp(scrollY / scrollable, 0, 1);
}

export function pageForRatio(ratio: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(total - 1, Math.floor(clamp(ratio, 0, 1) * total));
}

export function ratioForPage(pageIndex: number, total: number): number {
    if (total <= 1) return 0;
    return (clamp(pageIndex, 0, total - 1) + 0.5) / total;
}

export function ratioForClientY(clientY: number, margin = 16): number {
    return clamp((clientY - margin) / (innerHeight - 2 * margin), 0, 1);
}
