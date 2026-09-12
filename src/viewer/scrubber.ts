import { type ChapterContext, scrollToActiveIndex } from "./virtualizer";
import { CurrentSettings, UIState, ViewerState, loadImage } from "@/state";
import { addClass, removeClass, requireElement, setText, setVisible } from "@/core/dom-utils";
import {
    clamp,
    createAbortScope,
    createGenerationGuard,
    debounce,
    mapWithConcurrency,
    rafThrottle,
    syncWindow,
} from "@/core/utils";
import Config from "@/core/config";

const PREVIEW_GAP_PX = 12;
const DEFAULT_PREVIEW_ROW_HEIGHT_PX = 128;
const SCRUBBER_PREVIEW_BUFFER_ROWS = 6;

const scrubberParent = requireElement("#scrubber-parent");
const scrubberTrack = requireElement("#scrubber");
const scrubberPreview = requireElement("#scrubber-preview-track");
const scrubberMarkerActive = requireElement("#scrubber-marker-active");
const scrubberMarkerHover = requireElement("#scrubber-marker");

let isActive = false;
let isDragging = false;
let isVisible = false;
let trackHeight = 0;
let activeMarkerHeight = 0;
let hoverMarkerHeight = 0;
let hoverImageIndex = 0;
let visibleImageIndex = 0;

const EMPTY_CHAPTER_CONTEXT: ChapterContext = { chapterStartIndex: 0, mangaId: "", pageCount: 0 };

let chapter: ChapterContext = EMPTY_CHAPTER_CONTEXT;
const scrubberScope = createAbortScope();
let previewRowHeight = DEFAULT_PREVIEW_ROW_HEIGHT_PX;
let previewRowHeightKnown = false;
const previewGuard = createGenerationGuard();
let previewWindowCenter = -1;
let highlightedIndex: number | null = null;
const mountedPreview = new Map<number, HTMLImageElement>();

function previewRowTop(index: number): number {
    return index * (previewRowHeight + PREVIEW_GAP_PX);
}

function previewTotalHeight(): number {
    return chapter.pageCount > 0 ? chapter.pageCount * previewRowHeight + (chapter.pageCount - 1) * PREVIEW_GAP_PX : 0;
}

function resizePreviewContainer(): void {
    scrubberPreview.style.height = `${previewTotalHeight()}px`;
}

function repositionMountedPreview(): void {
    for (const [index, img] of mountedPreview) {
        img.style.top = `${previewRowTop(index)}px`;
    }
}

function setScrubberVisibility(visible: boolean): void {
    setVisible(scrubberParent, visible);
}

export function mountScrubber(chapterContext: ChapterContext, initialIndex: number): void {
    chapter = chapterContext;
    previewGuard.next();
    previewWindowCenter = -1;
    highlightedIndex = null;
    mountedPreview.clear();
    scrubberPreview.replaceChildren();
    scrubberPreview.style.height = "";

    hoverImageIndex = 0;
    isVisible = false;
    isActive = false;
    isDragging = false;

    const activeIndex = clamp(initialIndex, 0, Math.max(0, chapter.pageCount - 1));
    visibleImageIndex = activeIndex;

    applyScrubberEnabled(CurrentSettings.scrubberEnabled);

    hideScrubberUI(true);
    addScrubberListeners();
}

export function teardownScrubber(): void {
    scrubberScope.abort();
    previewGuard.next();
    mountedPreview.clear();
    scrubberPreview.replaceChildren();
    scrubberPreview.style.height = "";
    chapter = EMPTY_CHAPTER_CONTEXT;
    hideScrubberUI(true);
}

function applyScrubberEnabled(enabled: boolean): void {
    setScrubberVisibility(enabled);
    if (!enabled) {
        hideScrubberUI(true);
        return;
    }
    measureTrack();
    resizePreviewContainer();
    updatePreviewWindow(visibleImageIndex);
    updateActiveMarkerPosition();
}

export function initScrubber(): void {
    CurrentSettings.onChange("scrubberEnabled", () => applyScrubberEnabled(CurrentSettings.scrubberEnabled));
}

function updatePreviewWindow(centerIndex: number): void {
    if (chapter.pageCount === 0 || centerIndex === previewWindowCenter) return;
    previewWindowCenter = centerIndex;

    const rowSpan = previewRowHeight + PREVIEW_GAP_PX;
    const visibleRows = Math.ceil(innerHeight / rowSpan) + 2;
    const half = Math.ceil(visibleRows / 2) + SCRUBBER_PREVIEW_BUFFER_ROWS;
    const start = Math.max(0, centerIndex - half);
    const end = Math.min(chapter.pageCount, centerIndex + half + 1);

    const toMount = syncWindow(mountedPreview, start, end, (index) => {
        mountedPreview.get(index)?.remove();
        mountedPreview.delete(index);
    });
    if (toMount.length > 0) {
        void mapWithConcurrency(toMount, Config.IMAGE_LOAD_CONCURRENCY, mountPreviewThumb);
    }
}

async function mountPreviewThumb(index: number): Promise<void> {
    const token = previewGuard.current();
    const img = await loadImage(chapter.mangaId, chapter.chapterStartIndex + index);
    if (!previewGuard.isCurrent(token) || mountedPreview.has(index) || !img) return;

    addClass(
        img,
        "scrubber-preview-image absolute right-0 block h-32 sm:h-40 md:h-48 w-auto rounded-lg border-2 border-transparent transition-all duration-100",
    );
    img.style.top = `${previewRowTop(index)}px`;
    img.dataset.index = String(index);
    scrubberPreview.append(img);
    mountedPreview.set(index, img);

    if (!previewRowHeightKnown) {
        const measured = img.getBoundingClientRect().height;
        if (measured > 0) {
            previewRowHeight = measured;
            previewRowHeightKnown = true;
            resizePreviewContainer();
            repositionMountedPreview();
        }
    }

    if (index === highlightedIndex) {
        applyPreviewHighlight(index, true);
    }
}

function applyPreviewHighlight(index: number, active: boolean): void {
    const img = mountedPreview.get(index);
    if (!img) return;
    if (active) {
        img.style.borderColor = "var(--color-accent)";
        img.style.transform = "scale(1.05) translateX(-8px)";
        img.style.zIndex = "10";
    } else {
        img.style.borderColor = "";
        img.style.transform = "";
        img.style.zIndex = "";
    }
}

function addScrubberListeners(): void {
    const signal = scrubberScope.renew();

    ViewerState.onChange("visibleImageIndex", handleVisibleImageIndexChanged, { signal });
    scrubberTrack.addEventListener("mouseenter", handleMouseEnter, { signal });
    scrubberTrack.addEventListener("mouseleave", handleMouseLeave, { signal });
    scrubberTrack.addEventListener("mousemove", handleMouseMove, { signal });
    scrubberTrack.addEventListener("mousedown", handleMouseDown, { signal });
    addEventListener("mousemove", handleWindowMouseMove, { signal });
    addEventListener("mouseup", handleWindowMouseUp, { signal });
    addEventListener("resize", debouncedUpdateScreenHeight, { signal });
}

function handleVisibleImageIndexChanged(index: number): void {
    visibleImageIndex = index;
    updateActiveMarkerPosition();
}

function handleMouseEnter(): void {
    isActive = true;
    showScrubberUI();
    UIState.update("isNavVisible", false);
}

function handleMouseLeave(): void {
    isActive = false;
    if (!isDragging) hideScrubberUI();
}

const throttledHover = rafThrottle(updateHoverState);
const throttledDrag = rafThrottle((clientY: number) => {
    updateHoverState(clientY);
    scrollToActiveIndex(hoverImageIndex);
});

function handleMouseMove(event: MouseEvent): void {
    if (!isActive || isDragging) return;
    throttledHover(event.clientY);
}

function handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    isDragging = true;
    addClass(scrubberTrack, "cursor-grabbing");
    updateHoverState(event.clientY);
    scrollToActiveIndex(hoverImageIndex);
    event.preventDefault();
}

function handleWindowMouseMove(event: MouseEvent): void {
    if (!isDragging) return;
    throttledDrag(event.clientY);
}

function handleWindowMouseUp(event: MouseEvent): void {
    if (event.button !== 0 || !isDragging) return;
    isDragging = false;
    removeClass(scrubberTrack, "cursor-grabbing");
    if (!isActive) hideScrubberUI();
}

function showScrubberUI(): void {
    if (isVisible) return;
    isVisible = true;
    removeClass(scrubberParent, "opacity-0");
    removeClass(scrubberMarkerHover, "opacity-0");
}

function hideScrubberUI(force = false): void {
    if (!isVisible && !force) return;
    isVisible = false;
    addClass(scrubberParent, "opacity-0");
    addClass(scrubberMarkerHover, "opacity-0");
}

function markerOffset(ratio: number, trackHeightPx: number, markerHeight: number): number {
    return clamp(ratio * trackHeightPx - markerHeight / 2, 0, trackHeightPx - markerHeight);
}

function updateHoverState(clientY: number): void {
    if (!isVisible || chapter.pageCount === 0) return;

    const margin = 16;
    const ratio = clamp((clientY - margin) / (innerHeight - 2 * margin), 0, 1);
    const calculatedIndex = Math.floor(ratio * chapter.pageCount);
    const newHoverIndex = Math.min(calculatedIndex, chapter.pageCount - 1);

    const hoverMarkerY = markerOffset(ratio, trackHeight, hoverMarkerHeight);
    scrubberMarkerHover.style.transform = `translateY(${hoverMarkerY}px)`;

    // System-style indexing (e.g. 001 instead of 1)
    setText(scrubberMarkerHover, (newHoverIndex + 1).toString().padStart(2, "0"));

    const previewTotal = previewTotalHeight();
    if (previewTotal > trackHeight) {
        const targetScroll = ratio * previewTotal - clientY;
        scrubberPreview.style.transform = `translateY(${-targetScroll}px)`;
    }

    if (newHoverIndex !== hoverImageIndex || highlightedIndex === null) {
        if (highlightedIndex !== null) applyPreviewHighlight(highlightedIndex, false);
        highlightedIndex = newHoverIndex;
        applyPreviewHighlight(newHoverIndex, true);
    }
    hoverImageIndex = newHoverIndex;

    updatePreviewWindow(newHoverIndex);
}

function updateActiveMarkerPosition(): void {
    if (chapter.pageCount <= 1) {
        scrubberMarkerActive.style.transform = "translateY(0px)";
        setText(scrubberMarkerActive, chapter.pageCount > 0 ? "01" : "--");
        return;
    }

    const visualIndex = clamp(visibleImageIndex, 0, chapter.pageCount - 1);
    const ratio = (visualIndex + 0.5) / chapter.pageCount;
    const activeMarkerY = markerOffset(ratio, trackHeight, activeMarkerHeight);
    scrubberMarkerActive.style.transform = `translateY(${activeMarkerY}px)`;
    setText(scrubberMarkerActive, (visualIndex + 1).toString().padStart(2, "0"));
}

function measureTrack(): void {
    trackHeight = scrubberTrack.offsetHeight;
    activeMarkerHeight = scrubberMarkerActive.offsetHeight;
    hoverMarkerHeight = scrubberMarkerHover.offsetHeight;
}

function updateScreenHeight(): void {
    measureTrack();
    remeasurePreviewRowHeight();
    updateActiveMarkerPosition();
}

function remeasurePreviewRowHeight(): void {
    const first = mountedPreview.values().next().value;
    if (!first) {
        previewRowHeightKnown = false;
        return;
    }
    const measured = first.getBoundingClientRect().height;
    if (measured > 0 && measured !== previewRowHeight) {
        previewRowHeight = measured;
        previewRowHeightKnown = true;
        resizePreviewContainer();
        repositionMountedPreview();
    }
}
const debouncedUpdateScreenHeight = debounce(updateScreenHeight, 100);
