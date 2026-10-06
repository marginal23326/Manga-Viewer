import type { ChapterContext, ScrollAnchor } from "@/types";
import {
    CurrentSettings,
    type ImageDims,
    type MangaProgress,
    cachePageDimensions,
    getCachedPageDimensions,
    getImageUrl,
} from "@/state";
import { clamp, createGenerationGuard, mapWithConcurrency, rafThrottle } from "@/core/utils";
import type { State } from "@/core/create-state";
import { h } from "@/core/dom-utils";

const VIRTUALIZER_BUFFER_VIEWPORTS = 1.5;
const PAGE_LOAD_CONCURRENCY = 4;
const SCROLL_SNAP_SLACK_PX = 1;
const PLACEHOLDER_SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const FALLBACK_PAGE_DIMS: ImageDims = { height: 1200, width: 800 };

const PAGE_CLASS = "cursor-pointer data-loading:animate-pulse data-loading:rounded-2xl data-loading:bg-fg/4";

export interface ChapterVirtualizer {
    destroy: () => void;
    getScrollAnchor: () => ScrollAnchor;
    scrollToIndex: (index: number, pageFraction?: number, behavior?: ScrollBehavior) => void;
}

interface MountVirtualizerOptions {
    container: HTMLElement;
    context: ChapterContext;
    initialFraction: number;
    initialIndex: number;
    onIndexChange?: (localIndex: number) => void;
    progress: State<MangaProgress>;
}

function applyContainerVars(container: HTMLElement, progress: State<MangaProgress>): void {
    container.dataset.fit = CurrentSettings.imageFit;
    container.style.setProperty("--zoom", String(progress.zoomLevel));
    container.style.setProperty("--gap", `${CurrentSettings.spacingAmount}px`);
}

function applyDims(target: HTMLElement, prefix: "--" | "--est-", { height, width }: ImageDims): void {
    target.style.setProperty(`${prefix}w`, String(width));
    target.style.setProperty(`${prefix}h`, String(height));
}

function estimateDims(known: readonly ImageDims[]): ImageDims {
    if (known.length === 0) return FALLBACK_PAGE_DIMS;
    const mean = (pick: (dims: ImageDims) => number): number =>
        known.reduce((sum, d) => sum + pick(d), 0) / known.length;
    return { height: mean((d) => d.height), width: mean((d) => d.width) };
}

export function mountVirtualizer(options: MountVirtualizerOptions): ChapterVirtualizer {
    const { container, context, onIndexChange, progress } = options;
    const { pageCount } = context;

    const pages = Array.from({ length: pageCount }, (_, index) =>
        h("img", { alt: "", className: PAGE_CLASS, dataset: { index: String(index) }, src: PLACEHOLDER_SRC }),
    );

    const known: ImageDims[] = [];
    for (const [index, page] of pages.entries()) {
        const dims = getCachedPageDimensions(context, index);
        if (!dims) continue;
        applyDims(page, "--", dims);
        known.push(dims);
    }
    applyDims(container, "--est-", estimateDims(known));
    applyContainerVars(container, progress);

    const near = new Set<number>();
    const jumpGuard = createGenerationGuard();
    let lastAnchor: ScrollAnchor = { index: 0, pageFraction: 0 };
    let lastReportedIndex = -1;
    let destroyed = false;

    function pageAt(viewportY: number): number {
        let lo = 0;
        let hi = pageCount - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if ((pages[mid]?.getBoundingClientRect().top ?? 0) <= viewportY + SCROLL_SNAP_SLACK_PX) lo = mid;
            else hi = mid - 1;
        }
        return lo;
    }

    function getScrollAnchor(): ScrollAnchor {
        const index = pageAt(0);
        const rect = pages[index]?.getBoundingClientRect();
        return { index, pageFraction: rect && rect.height > 0 ? clamp(-rect.top / rect.height, 0, 1) : 0 };
    }

    function scrollTopFor({ index, pageFraction }: ScrollAnchor): number {
        if (index === 0 && pageFraction === 0) return 0;
        const rect = pages[index]?.getBoundingClientRect();
        return rect ? Math.max(0, scrollY + rect.top + pageFraction * rect.height) : scrollY;
    }

    function syncPosition(): void {
        lastAnchor = getScrollAnchor();
        const atEnd = scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 1;
        const index = atEnd ? pageCount - 1 : lastAnchor.index;
        if (index === lastReportedIndex) return;
        lastReportedIndex = index;
        onIndexChange?.(index);
    }

    const scheduleSync = rafThrottle(syncPosition);

    async function fetchPage(index: number): Promise<string | null> {
        const url = await getImageUrl(context, index);
        const page = pages[index];
        if (!url || !page || destroyed) return null;
        page.src = url;
        try {
            await page.decode();
        } catch {
            page.src = PLACEHOLDER_SRC;
            return null;
        }
        if (destroyed) return null;
        const { naturalHeight: height, naturalWidth: width } = page;
        if (width && height) {
            cachePageDimensions(context, index, { height, width });
            applyDims(page, "--", { height, width });
            scheduleSync();
        }
        return url;
    }

    async function loadPage(index: number): Promise<void> {
        const page = pages[index];
        if (
            !page ||
            !near.has(index) ||
            Object.hasOwn(page.dataset, "loading") ||
            page.getAttribute("src") !== PLACEHOLDER_SRC
        )
            return;

        page.dataset.loading = "";
        await fetchPage(index);
        delete page.dataset.loading;
        if (!destroyed && !near.has(index)) unloadPage(index);
    }

    function unloadPage(index: number): void {
        const page = pages[index];
        if (!page) return;
        page.src = PLACEHOLDER_SRC;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            const entering: number[] = [];
            for (const { isIntersecting, target } of entries) {
                const index = Number((target as HTMLElement).dataset.index);
                if (isIntersecting) {
                    near.add(index);
                    entering.push(index);
                } else {
                    near.delete(index);
                    unloadPage(index);
                }
            }
            void mapWithConcurrency(entering, PAGE_LOAD_CONCURRENCY, loadPage);
        },
        { rootMargin: `${VIRTUALIZER_BUFFER_VIEWPORTS * 100}% 0px` },
    );

    function restore(anchor: ScrollAnchor): void {
        scrollTo({ top: scrollTopFor(anchor) });
        syncPosition();
    }

    async function jumpTo(index: number, pageFraction: number, behavior: ScrollBehavior): Promise<void> {
        const anchor = { index: clamp(index, 0, pageCount - 1), pageFraction: clamp(pageFraction, 0, 1) };
        const token = jumpGuard.next();

        if (anchor.pageFraction > 0 && !getCachedPageDimensions(context, anchor.index)) {
            await fetchPage(anchor.index);
            if (destroyed || !jumpGuard.isCurrent(token)) return;
        }

        scrollTo({ behavior, top: scrollTopFor(anchor) });
        syncPosition();
    }

    function onSizingChange(): void {
        if (destroyed) return;
        const anchor = getScrollAnchor();
        applyContainerVars(container, progress);
        restore(anchor);
    }

    function onResize(): void {
        if (!destroyed) restore(lastAnchor);
    }

    const listeners = new AbortController();
    const { signal } = listeners;
    addEventListener("scroll", scheduleSync, { passive: true, signal });
    addEventListener("resize", onResize, { signal });
    CurrentSettings.onChange(["imageFit", "spacingAmount"], onSizingChange, { signal });
    progress.onChange("zoomLevel", onSizingChange, { signal });

    container.append(...pages);
    void jumpTo(options.initialIndex, options.initialFraction, "instant").then(() => {
        if (destroyed) return;
        for (const page of pages) observer.observe(page);
    });

    return {
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            listeners.abort();
            observer.disconnect();
            container.replaceChildren();
        },
        getScrollAnchor,
        scrollToIndex(index: number, pageFraction = 0, behavior: ScrollBehavior = "instant"): void {
            void jumpTo(index, pageFraction, behavior);
        },
    };
}
