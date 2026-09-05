import { CurrentProgress, CurrentSettings } from "@/state";
import type { ImageFit, ScrollAnchor } from "@/types";
import { clamp, createGenerationGuard, mapWithConcurrency, rafThrottle } from "@/core/utils";
import { h, setVisible } from "@/core/dom-utils";
import Config from "@/core/config";
import { loadImage } from "./image-loader";

interface PageDims {
    height: number;
    width: number;
}

export interface ChapterContext {
    chapterStartIndex: number;
    imagesBasePath: string;
    pageCount: number;
}

function computePageHeight(
    dims: PageDims | null,
    imageFit: ImageFit,
    zoomLevel: number,
    containerWidth: number,
): number | null {
    if (imageFit === "height") {
        return innerHeight * zoomLevel;
    }
    if (!dims?.width || !dims.height) {
        return null;
    }
    if (imageFit === "width") {
        const renderedWidth = containerWidth * zoomLevel;
        return dims.height * (renderedWidth / dims.width);
    }
    return dims.height * zoomLevel;
}

export interface ChapterVirtualizer {
    destroy: () => void;
    getScrollAnchor: () => ScrollAnchor;
    ready: Promise<void>;
    scrollToIndex: (index: number, within?: number, behavior?: ScrollBehavior) => void;
}

export interface MountVirtualizerOptions {
    container: HTMLElement;
    context: ChapterContext;
    initialIndex: number;
    initialOffset: number;
    onIndexChange?: (localIndex: number) => void;
    onMount?: (img: HTMLImageElement, localIndex: number) => void;
    onNearEnd?: () => void;
    onRangeChange?: (globalStart: number, globalEnd: number) => void;
}

function currentGap(): number {
    const { collapseSpacing, spacingAmount } = CurrentSettings;
    return collapseSpacing ? 0 : spacingAmount;
}

function applyContainerVars(container: HTMLElement): void {
    container.dataset.fit = CurrentSettings.imageFit;
    container.style.setProperty("--zoom", String(CurrentProgress.zoomLevel));
    container.style.setProperty("--gap", `${currentGap()}px`);
}

let activeInstance: ChapterVirtualizer | null = null;

export function getActiveScrollAnchor(): ScrollAnchor | null {
    return activeInstance ? activeInstance.getScrollAnchor() : null;
}

export function scrollToActiveIndex(index: number, within = 0, behavior: ScrollBehavior = "instant"): void {
    activeInstance?.scrollToIndex(index, within, behavior);
}

export function destroyActiveVirtualizer(): void {
    activeInstance?.destroy();
}

export function mountVirtualizer(options: MountVirtualizerOptions): ChapterVirtualizer {
    const { container, context } = options;
    const { chapterStartIndex, imagesBasePath, pageCount } = context;

    const naturalDims: (PageDims | null)[] = Array.from({ length: pageCount }, () => null);
    let estimate = Config.DEFAULT_ESTIMATED_PAGE_HEIGHT_PX;
    const offsets: number[] = Array.from({ length: pageCount + 1 }, () => 0);

    const mounted = new Map<number, HTMLDivElement>();

    const topSpacer = h("div", { className: "w-full", hidden: true });
    const bottomSpacer = h("div", { className: "w-full", hidden: true });
    container.append(topSpacer, bottomSpacer);
    container.style.overflowAnchor = "none";
    applyContainerVars(container);

    let range = { end: 0, start: 0 };
    let lastReportedIndex = -1;
    let nearEndFired = false;
    let destroyed = false;
    const jumpGuard = createGenerationGuard();

    function totalHeight(): number {
        return offsets[pageCount] ?? 0;
    }

    function pageHeight(i: number): number {
        return (offsets[i + 1] ?? 0) - (offsets[i] ?? 0);
    }

    function rebuildOffsets(): void {
        const { imageFit } = CurrentSettings;
        const { zoomLevel } = CurrentProgress;
        const gap = currentGap();
        const containerWidth = container.clientWidth;

        let sum = 0;
        let count = 0;
        for (const dims of naturalDims) {
            if (!dims) continue;
            const height = computePageHeight(dims, imageFit, zoomLevel, containerWidth);
            if (height) {
                sum += height;
                count++;
            }
        }
        if (count > 0) estimate = sum / count;

        let y = 0;
        for (let i = 0; i < pageCount; i++) {
            offsets[i] = y;
            const known = computePageHeight(naturalDims[i] ?? null, imageFit, zoomLevel, containerWidth);
            y += (known ?? estimate) + (i < pageCount - 1 ? gap : 0);
        }
        offsets[pageCount] = y;
    }

    function updateSpacers(): void {
        if (range.start > 0) {
            setVisible(topSpacer, true);
            topSpacer.style.height = `${Math.max(0, (offsets[range.start] ?? 0) - currentGap())}px`;
        } else {
            setVisible(topSpacer, false);
        }

        if (range.end < pageCount) {
            setVisible(bottomSpacer, true);
            bottomSpacer.style.height = `${Math.max(0, totalHeight() - (offsets[range.end] ?? 0))}px`;
        } else {
            setVisible(bottomSpacer, false);
        }
    }

    function findIndexAt(y: number): number {
        let lo = 0;
        let hi = pageCount - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if ((offsets[mid] ?? 0) <= y) lo = mid;
            else hi = mid - 1;
        }
        return clamp(lo, 0, pageCount - 1);
    }

    function insertWrapper(localIndex: number, wrapper: HTMLDivElement): void {
        let nextIndex = Infinity;
        let nextWrapper: HTMLDivElement | undefined;
        for (const [index, el] of mounted) {
            if (index > localIndex && index < nextIndex) {
                nextIndex = index;
                nextWrapper = el;
            }
        }
        (nextWrapper ?? bottomSpacer).before(wrapper);
    }

    function unmountPage(localIndex: number): void {
        mounted.get(localIndex)?.remove();
        mounted.delete(localIndex);
    }

    async function mountPage(localIndex: number): Promise<void> {
        const { imageFit } = CurrentSettings;
        const { zoomLevel } = CurrentProgress;
        const placeholderHeight =
            computePageHeight(naturalDims[localIndex] ?? null, imageFit, zoomLevel, container.clientWidth) ?? estimate;
        const placeholder = h("div", {
            className: "w-full max-w-5xl mx-auto rounded-2xl bg-ink/[0.04] dark:bg-white/[0.04] animate-pulse",
            style: { height: `${placeholderHeight}px` },
        });
        const wrapper = h(
            "div",
            { className: "w-full flex justify-center", dataset: { index: String(localIndex) } },
            placeholder,
        );
        mounted.set(localIndex, wrapper);
        insertWrapper(localIndex, wrapper);

        let img: HTMLImageElement | null = null;
        try {
            img = await loadImage(imagesBasePath, chapterStartIndex + localIndex + 1);
        } catch (error: unknown) {
            console.error(`Virtualizer: failed to load page ${localIndex}:`, error);
        }

        if (destroyed || mounted.get(localIndex) !== wrapper) return;

        if (!img) {
            unmountPage(localIndex);
            return;
        }

        img.style.setProperty("--natural-w", String(img.naturalWidth || container.clientWidth));
        wrapper.replaceChildren(img);
        options.onMount?.(img, localIndex);

        if (naturalDims[localIndex] === null && img.naturalWidth && img.naturalHeight) {
            naturalDims[localIndex] = { height: img.naturalHeight, width: img.naturalWidth };
            rebuildOffsets();
            updateSpacers();
        }
    }

    function reportIndexIfChanged(): void {
        const center = Math.max(0, scrollY + innerHeight / 2);
        const index = findIndexAt(center);
        if (index !== lastReportedIndex) {
            lastReportedIndex = index;
            options.onIndexChange?.(index);
        }
    }

    function render(force = false): Promise<void> {
        if (destroyed) return Promise.resolve();

        const bufferPx = innerHeight * Config.VIRTUALIZER_BUFFER_VIEWPORTS;
        const newStart = findIndexAt(Math.max(0, scrollY - bufferPx));
        const newEnd = Math.min(pageCount, findIndexAt(Math.max(0, scrollY + innerHeight + bufferPx)) + 1);
        const rangeChanged = newStart !== range.start || newEnd !== range.end;

        if (!force && !rangeChanged) {
            reportIndexIfChanged();
            return Promise.resolve();
        }

        if (rangeChanged) {
            const toUnmount = [...mounted.keys()].filter((i) => i < newStart || i >= newEnd);
            for (const i of toUnmount) unmountPage(i);
        }

        const toMount: number[] = [];
        for (let i = newStart; i < newEnd; i++) {
            if (!mounted.has(i)) toMount.push(i);
        }

        range = { end: newEnd, start: newStart };
        updateSpacers();

        const mountBatch: Promise<unknown> =
            toMount.length > 0
                ? mapWithConcurrency(toMount, Config.IMAGE_LOAD_CONCURRENCY, mountPage)
                : Promise.resolve();

        if (rangeChanged) {
            options.onRangeChange?.(chapterStartIndex + newStart, chapterStartIndex + newEnd);
        }
        reportIndexIfChanged();

        if (!nearEndFired && newEnd >= pageCount - Config.NEXT_CHAPTER_PRELOAD_TRIGGER_PAGES) {
            nearEndFired = true;
            options.onNearEnd?.();
        }

        return mountBatch.then(() => {});
    }

    async function settleScrollTo(index: number, within: number): Promise<void> {
        const token = jumpGuard.next();
        let lastTarget = Math.max(0, (offsets[index] ?? 0) + within);

        for (let attempt = 0; attempt < Config.VIRTUALIZER_SETTLE_ATTEMPTS; attempt++) {
            await render(true);
            if (destroyed || !jumpGuard.isCurrent(token)) return;

            const nextTarget = Math.max(0, (offsets[index] ?? 0) + within);
            if (nextTarget === lastTarget) return;

            lastTarget = nextTarget;
            scrollTo({ top: nextTarget });
        }
    }

    function jumpTo(index: number, within: number, behavior: ScrollBehavior): Promise<void> {
        const clamped = clamp(index, 0, pageCount - 1);
        scrollTo({ behavior, top: Math.max(0, (offsets[clamped] ?? 0) + within) });
        return settleScrollTo(clamped, within);
    }

    const onScroll = rafThrottle(() => void render());

    function getScrollAnchor(): ScrollAnchor {
        const index = findIndexAt(Math.max(0, scrollY));
        return { index, offset: Math.max(0, scrollY - (offsets[index] ?? 0)) };
    }

    function applySizingChange(): void {
        if (destroyed) return;
        const { index, offset } = getScrollAnchor();
        const oldHeight = pageHeight(index);

        applyContainerVars(container);
        rebuildOffsets();

        const scale = oldHeight > 0 ? pageHeight(index) / oldHeight : 0;
        const target = Math.max(0, (offsets[index] ?? 0) + offset * scale);
        if (target !== scrollY) {
            scrollTo({ top: target });
        }
        void render(true);
    }

    const listeners = new AbortController();
    addEventListener("scroll", onScroll, { passive: true, signal: listeners.signal });
    for (const key of ["imageFit", "collapseSpacing", "spacingAmount"] as const) {
        CurrentSettings.onChange(key, applySizingChange, { signal: listeners.signal });
    }
    CurrentProgress.onChange("zoomLevel", applySizingChange, { signal: listeners.signal });
    addEventListener("resize", rafThrottle(applySizingChange), { signal: listeners.signal });

    let ready: Promise<void> = Promise.resolve();
    if (pageCount > 0) {
        rebuildOffsets();
        setVisible(topSpacer, true);
        topSpacer.style.height = `${totalHeight()}px`;
        ready = jumpTo(options.initialIndex, options.initialOffset, "instant");
    }

    const instance: ChapterVirtualizer = {
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            listeners.abort();
            // eslint-disable-next-line no-useless-spread -- copy before iterating; unmountPage() mutates the map.
            for (const i of [...mounted.keys()]) unmountPage(i);
            topSpacer.remove();
            bottomSpacer.remove();
            container.style.overflowAnchor = "";
            if (activeInstance === instance) activeInstance = null;
        },
        getScrollAnchor,
        ready,
        scrollToIndex(index: number, within = 0, behavior: ScrollBehavior = "instant"): void {
            void jumpTo(index, within, behavior);
        },
    };

    activeInstance = instance;
    return instance;
}
