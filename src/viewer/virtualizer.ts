import { applyPageStyle, applyPageStylesToImages, computeAnalyticPageHeight } from "./zoom";
import { clamp, createGenerationGuard, mapWithConcurrency } from "@/core/utils";
import { offAppEvent, onAppEvent } from "@/core/app-events";
import Config from "@/core/config";
import type { ImageFit } from "@/types";
import { h } from "@/core/dom-utils";
import { loadImage } from "./image-loader";

export interface VirtualizerSizingSettings {
    collapseSpacing: boolean;
    imageFit: ImageFit;
    spacingAmount: number;
    zoomLevel: number;
}

export interface ChapterVirtualizer {
    destroy: () => void;
    getScrollAnchor: () => { index: number; offset: number };
    ready: Promise<void>;
    scrollToIndex: (index: number, within?: number, behavior?: ScrollBehavior) => void;
}

export interface MountVirtualizerOptions {
    chapterStartIndex: number;
    container: HTMLElement;
    getSettings: () => VirtualizerSizingSettings;
    imagesBasePath: string;
    initialIndex: number;
    initialOffset: number;
    onIndexChange?: (localIndex: number) => void;
    onMount?: (img: HTMLImageElement, localIndex: number) => void;
    onNearEnd?: () => void;
    onRangeChange?: (globalStart: number, globalEnd: number) => void;
    pageCount: number;
}

interface VirtualizerInternal extends ChapterVirtualizer {
    remeasure: () => void;
}

let activeInstance: VirtualizerInternal | null = null;

onAppEvent("pageSizingChanged", () => activeInstance?.remeasure());

export function getActiveScrollAnchor(): { index: number; offset: number } | null {
    return activeInstance ? activeInstance.getScrollAnchor() : null;
}

export function scrollToActiveIndex(index: number, within = 0, behavior: ScrollBehavior = "instant"): void {
    activeInstance?.scrollToIndex(index, within, behavior);
}

export function destroyActiveVirtualizer(): void {
    activeInstance?.destroy();
}

export function mountVirtualizer(options: MountVirtualizerOptions): ChapterVirtualizer {
    const { chapterStartIndex, container, getSettings, imagesBasePath, pageCount } = options;

    const naturalDims: ({ height: number; width: number } | null)[] = Array.from({ length: pageCount }, () => null);
    let estimate = Config.DEFAULT_ESTIMATED_PAGE_HEIGHT_PX;
    const offsets: number[] = Array.from({ length: pageCount + 1 }, () => 0);

    const mountedIndices: number[] = [];
    const mounted = new Map<number, HTMLDivElement>();

    const topSpacer = h("div", { className: "w-full hidden" });
    const bottomSpacer = h("div", { className: "w-full hidden" });
    container.append(topSpacer, bottomSpacer);
    container.style.overflowAnchor = "none";

    let range = { end: 0, start: 0 };
    let lastReportedIndex = -1;
    let nearEndFired = false;
    let ticking = false;
    let destroyed = false;
    const jumpGuard = createGenerationGuard();

    function totalHeight(): number {
        return offsets[pageCount] ?? 0;
    }

    function pageHeight(i: number): number {
        return (offsets[i + 1] ?? 0) - (offsets[i] ?? 0);
    }

    function rebuildOffsets(): void {
        const settings = getSettings();
        const gap = settings.collapseSpacing ? 0 : settings.spacingAmount;
        const containerWidth = container.clientWidth;

        let y = 0;
        for (let i = 0; i < pageCount; i++) {
            offsets[i] = y;
            const dims = naturalDims[i];
            const known = computeAnalyticPageHeight(
                dims?.width ?? null,
                dims?.height ?? null,
                settings.imageFit,
                settings.zoomLevel,
                containerWidth,
            );
            y += (known ?? estimate) + (i < pageCount - 1 ? gap : 0);
        }
        offsets[pageCount] = y;
    }

    function recalculateEstimate(): void {
        const settings = getSettings();
        const containerWidth = container.clientWidth;
        let sum = 0;
        let count = 0;
        for (const dims of naturalDims) {
            if (!dims) continue;
            const height = computeAnalyticPageHeight(
                dims.width,
                dims.height,
                settings.imageFit,
                settings.zoomLevel,
                containerWidth,
            );
            if (height) {
                sum += height;
                count++;
            }
        }
        if (count > 0) estimate = sum / count;
    }

    function updateSpacers(): void {
        const settings = getSettings();
        const gap = settings.collapseSpacing ? 0 : settings.spacingAmount;

        if (range.start > 0) {
            topSpacer.classList.remove("hidden");
            topSpacer.style.height = `${Math.max(0, (offsets[range.start] ?? 0) - gap)}px`;
        } else {
            topSpacer.classList.add("hidden");
        }

        if (range.end < pageCount) {
            bottomSpacer.classList.remove("hidden");
            bottomSpacer.style.height = `${Math.max(0, totalHeight() - (offsets[range.end] ?? 0))}px`;
        } else {
            bottomSpacer.classList.add("hidden");
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
        let pos = mountedIndices.length;
        for (let k = 0; k < mountedIndices.length; k++) {
            const existing = mountedIndices[k];
            if (existing !== undefined && existing > localIndex) {
                pos = k;
                break;
            }
        }
        mountedIndices.splice(pos, 0, localIndex);

        if (pos === mountedIndices.length - 1) {
            bottomSpacer.before(wrapper);
        } else {
            const nextIndex = mountedIndices[pos + 1];
            const nextWrapper = nextIndex === undefined ? undefined : mounted.get(nextIndex);
            (nextWrapper ?? bottomSpacer).before(wrapper);
        }
    }

    function unmountPage(localIndex: number): void {
        mounted.get(localIndex)?.remove();
        mounted.delete(localIndex);
        const pos = mountedIndices.indexOf(localIndex);
        if (pos !== -1) mountedIndices.splice(pos, 1);
    }

    async function mountPage(localIndex: number): Promise<void> {
        const settings = getSettings();
        const containerWidth = container.clientWidth;
        const dims = naturalDims[localIndex];
        const placeholderHeight =
            computeAnalyticPageHeight(
                dims?.width ?? null,
                dims?.height ?? null,
                settings.imageFit,
                settings.zoomLevel,
                containerWidth,
            ) ?? estimate;
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

        applyPageStyle(img, settings.imageFit, settings.zoomLevel, containerWidth);
        wrapper.replaceChildren(img);
        options.onMount?.(img, localIndex);

        if (naturalDims[localIndex] === null && img.naturalWidth && img.naturalHeight) {
            naturalDims[localIndex] = { height: img.naturalHeight, width: img.naturalWidth };
            recalculateEstimate();
            rebuildOffsets();
            updateSpacers();
        }
    }

    function reportIndexIfChanged(): void {
        const center = Math.max(0, window.scrollY + window.innerHeight / 2);
        const index = findIndexAt(center);
        if (index !== lastReportedIndex) {
            lastReportedIndex = index;
            options.onIndexChange?.(index);
        }
    }

    function render(force = false): Promise<void> {
        if (destroyed) return Promise.resolve();

        const bufferPx = window.innerHeight * Config.VIRTUALIZER_BUFFER_VIEWPORTS;
        const newStart = findIndexAt(Math.max(0, window.scrollY - bufferPx));
        const newEnd = Math.min(
            pageCount,
            findIndexAt(Math.max(0, window.scrollY + window.innerHeight + bufferPx)) + 1,
        );
        const rangeChanged = newStart !== range.start || newEnd !== range.end;

        if (!force && !rangeChanged) {
            reportIndexIfChanged();
            return Promise.resolve();
        }

        if (rangeChanged) {
            const toUnmount = mountedIndices.filter((i) => i < newStart || i >= newEnd);
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
            window.scrollTo({ top: nextTarget });
        }
    }

    function jumpTo(index: number, within: number, behavior: ScrollBehavior): Promise<void> {
        const clamped = clamp(index, 0, pageCount - 1);
        window.scrollTo({ behavior, top: Math.max(0, (offsets[clamped] ?? 0) + within) });
        return settleScrollTo(clamped, within);
    }

    function onScrollOrResize(): void {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            void render();
        });
    }

    function getScrollAnchor(): { index: number; offset: number } {
        const index = findIndexAt(Math.max(0, window.scrollY));
        return { index, offset: Math.max(0, window.scrollY - (offsets[index] ?? 0)) };
    }

    function remeasure(): void {
        if (destroyed) return;
        const settings = getSettings();
        const images: HTMLImageElement[] = [];
        for (const wrapper of mounted.values()) {
            const img = wrapper.lastElementChild;
            if (img instanceof HTMLImageElement) images.push(img);
        }
        applyPageStylesToImages(images, settings.imageFit, settings.zoomLevel, container.clientWidth);
        recalculateEstimate();
        rebuildOffsets();
        void render(true);
    }

    function onResize(): void {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            const { index, offset } = getScrollAnchor();
            const oldHeight = pageHeight(index);
            remeasure();
            const scale = oldHeight > 0 ? pageHeight(index) / oldHeight : 0;
            const target = Math.max(0, (offsets[index] ?? 0) + offset * scale);
            if (target !== window.scrollY) {
                window.scrollTo({ top: target });
            }
        });
    }

    onAppEvent("viewerScroll", onScrollOrResize);
    window.addEventListener("resize", onResize);

    let ready: Promise<void> = Promise.resolve();
    if (pageCount > 0) {
        rebuildOffsets();
        topSpacer.classList.remove("hidden");
        topSpacer.style.height = `${totalHeight()}px`;
        ready = jumpTo(options.initialIndex, options.initialOffset, "instant");
    }

    const instance: VirtualizerInternal = {
        destroy(): void {
            if (destroyed) return;
            destroyed = true;
            offAppEvent("viewerScroll", onScrollOrResize);
            window.removeEventListener("resize", onResize);
            // eslint-disable-next-line no-useless-spread -- copy before iterating; unmountPage() splices the array.
            for (const i of [...mountedIndices]) unmountPage(i);
            topSpacer.remove();
            bottomSpacer.remove();
            container.style.overflowAnchor = "";
            if (activeInstance === instance) activeInstance = null;
        },
        getScrollAnchor,
        ready,
        remeasure: () => remeasure(),
        scrollToIndex(index: number, within = 0, behavior: ScrollBehavior = "instant"): void {
            void jumpTo(index, within, behavior);
        },
    };

    activeInstance = instance;
    return instance;
}
