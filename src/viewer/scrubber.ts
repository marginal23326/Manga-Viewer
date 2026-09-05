import { type ChapterContext, scrollToActiveIndex } from "./virtualizer";
import { CurrentSettings, UIState, ViewerState } from "@/state";
import { DOM, addClass, removeClass, setText, setVisible } from "@/core/dom-utils";
import { clamp, createGenerationGuard, debounce, mapWithConcurrency, renewController } from "@/core/utils";
import Config from "@/core/config";
import { loadImage } from "@/viewer/image-loader";

const PREVIEW_GAP_PX = 12;
const DEFAULT_PREVIEW_ROW_HEIGHT_PX = 128;

let scrubberParent: HTMLElement | null = null;
let scrubberTrack: HTMLElement | null = null;
let scrubberPreview: HTMLElement | null = null;
let scrubberMarkerActive: HTMLElement | null = null;
let scrubberMarkerHover: HTMLElement | null = null;

interface ScrubberState {
    activeMarkerHeight: number;
    hoverImageIndex: number;
    hoverMarkerHeight: number;
    isActive: boolean;
    isDragging: boolean;
    isVisible: boolean;
    trackHeight: number;
    visibleImageIndex: number;
}

const state: ScrubberState = {
    activeMarkerHeight: 0,
    hoverImageIndex: 0,
    hoverMarkerHeight: 0,
    isActive: false,
    isDragging: false,
    isVisible: false,
    trackHeight: 0,
    visibleImageIndex: 0,
};

let chapter: ChapterContext = { chapterStartIndex: 0, imagesBasePath: "", pageCount: 0 };
let scrubberController = new AbortController();
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
    if (scrubberPreview) scrubberPreview.style.height = `${previewTotalHeight()}px`;
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
    ({ scrubberParent, scrubberTrack, scrubberPreview, scrubberMarkerActive, scrubberMarkerHover } = DOM);

    if (!scrubberParent || !scrubberTrack || !scrubberPreview || !scrubberMarkerActive || !scrubberMarkerHover) {
        return;
    }

    chapter = chapterContext;
    previewGuard.next();
    previewWindowCenter = -1;
    highlightedIndex = null;
    mountedPreview.clear();
    scrubberPreview.replaceChildren();
    scrubberPreview.style.height = "";

    state.hoverImageIndex = 0;
    state.isVisible = false;
    state.isActive = false;
    state.isDragging = false;

    const activeIndex = clamp(initialIndex, 0, Math.max(0, chapter.pageCount - 1));
    state.visibleImageIndex = activeIndex;

    applyScrubberEnabled(CurrentSettings.scrubberEnabled);

    hideScrubberUI(true);
    addScrubberListeners();
}

export function teardownScrubber(): void {
    scrubberController.abort();
    previewGuard.next();
    mountedPreview.clear();
    if (scrubberPreview) {
        scrubberPreview.replaceChildren();
        scrubberPreview.style.height = "";
    }
    chapter = { chapterStartIndex: 0, imagesBasePath: "", pageCount: 0 };
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
    updatePreviewWindow(state.visibleImageIndex);
    updateActiveMarkerPosition();
}

export function initScrubber(): void {
    CurrentSettings.onChange("scrubberEnabled", () => applyScrubberEnabled(CurrentSettings.scrubberEnabled));
}

function updatePreviewWindow(centerIndex: number): void {
    if (!scrubberPreview || chapter.pageCount === 0 || centerIndex === previewWindowCenter) return;
    previewWindowCenter = centerIndex;

    const rowSpan = previewRowHeight + PREVIEW_GAP_PX;
    const visibleRows = Math.ceil(innerHeight / rowSpan) + 2;
    const half = Math.ceil(visibleRows / 2) + Config.SCRUBBER_PREVIEW_BUFFER_ROWS;
    const start = Math.max(0, centerIndex - half);
    const end = Math.min(chapter.pageCount, centerIndex + half + 1);

    for (const index of mountedPreview.keys()) {
        if (index < start || index >= end) {
            mountedPreview.get(index)?.remove();
            mountedPreview.delete(index);
        }
    }

    const toMount: number[] = [];
    for (let i = start; i < end; i++) {
        if (!mountedPreview.has(i)) toMount.push(i);
    }
    if (toMount.length > 0) {
        void mapWithConcurrency(toMount, Config.IMAGE_LOAD_CONCURRENCY, mountPreviewThumb);
    }
}

async function mountPreviewThumb(index: number): Promise<void> {
    const token = previewGuard.current();
    const img = await loadImage(chapter.imagesBasePath, chapter.chapterStartIndex + index + 1);
    if (!previewGuard.isCurrent(token) || !scrubberPreview || mountedPreview.has(index) || !img) return;

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
    if (!scrubberTrack) return;
    scrubberController = renewController(scrubberController);
    const { signal } = scrubberController;

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
    state.visibleImageIndex = index;
    updateActiveMarkerPosition();
}

function handleMouseEnter(): void {
    state.isActive = true;
    showScrubberUI();
    UIState.update("isNavVisible", false);
}

function handleMouseLeave(): void {
    state.isActive = false;
    if (!state.isDragging) hideScrubberUI();
}

function handleMouseMove(event: MouseEvent): void {
    if (!state.isActive || state.isDragging) return;
    updateHoverState(event.clientY);
}

function handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    state.isDragging = true;
    addClass(scrubberTrack, "cursor-grabbing");
    updateHoverState(event.clientY);
    scrollToActiveIndex(state.hoverImageIndex);
    event.preventDefault();
}

function handleWindowMouseMove(event: MouseEvent): void {
    if (!state.isDragging) return;
    updateHoverState(event.clientY);
    scrollToActiveIndex(state.hoverImageIndex);
}

function handleWindowMouseUp(event: MouseEvent): void {
    if (event.button !== 0 || !state.isDragging) return;
    state.isDragging = false;
    removeClass(scrubberTrack, "cursor-grabbing");
    if (!state.isActive) hideScrubberUI();
}

function showScrubberUI(): void {
    if (!state.isVisible && scrubberParent) {
        state.isVisible = true;
        removeClass(scrubberParent, "opacity-0");
        removeClass(scrubberMarkerHover, "opacity-0");
    }
}

function hideScrubberUI(force = false): void {
    if ((state.isVisible || force) && scrubberParent) {
        state.isVisible = false;
        addClass(scrubberParent, "opacity-0");
        addClass(scrubberMarkerHover, "opacity-0");
    }
}

function markerOffset(ratio: number, trackHeight: number, markerHeight: number): number {
    return clamp(ratio * trackHeight - markerHeight / 2, 0, trackHeight - markerHeight);
}

function updateHoverState(clientY: number): void {
    if (!state.isVisible || chapter.pageCount === 0 || !scrubberMarkerHover) return;
    const markerHover = scrubberMarkerHover;

    const margin = 16;
    const ratio = clamp((clientY - margin) / (innerHeight - 2 * margin), 0, 1);
    const calculatedIndex = Math.floor(ratio * chapter.pageCount);
    const newHoverIndex = Math.min(calculatedIndex, chapter.pageCount - 1);

    const hoverMarkerY = markerOffset(ratio, state.trackHeight, state.hoverMarkerHeight);
    markerHover.style.transform = `translateY(${hoverMarkerY}px)`;

    // System-style indexing (e.g. 001 instead of 1)
    setText(markerHover, (newHoverIndex + 1).toString().padStart(2, "0"));

    const previewTotal = previewTotalHeight();
    if (previewTotal > state.trackHeight && scrubberPreview) {
        const targetScroll = ratio * previewTotal - clientY;
        scrubberPreview.style.transform = `translateY(${-targetScroll}px)`;
    }

    if (newHoverIndex !== state.hoverImageIndex || highlightedIndex === null) {
        if (highlightedIndex !== null) applyPreviewHighlight(highlightedIndex, false);
        highlightedIndex = newHoverIndex;
        applyPreviewHighlight(newHoverIndex, true);
    }
    state.hoverImageIndex = newHoverIndex;

    updatePreviewWindow(newHoverIndex);
}

function updateActiveMarkerPosition(): void {
    if (!scrubberMarkerActive) return;

    if (chapter.pageCount <= 1) {
        scrubberMarkerActive.style.transform = "translateY(0px)";
        setText(scrubberMarkerActive, chapter.pageCount > 0 ? "01" : "--");
        return;
    }

    const visualIndex = clamp(state.visibleImageIndex, 0, chapter.pageCount - 1);
    const ratio = (visualIndex + 0.5) / chapter.pageCount;
    const activeMarkerY = markerOffset(ratio, state.trackHeight, state.activeMarkerHeight);
    scrubberMarkerActive.style.transform = `translateY(${activeMarkerY}px)`;
    setText(scrubberMarkerActive, (visualIndex + 1).toString().padStart(2, "0"));
}

function measureTrack(): void {
    state.trackHeight = scrubberTrack?.offsetHeight ?? 0;
    state.activeMarkerHeight = scrubberMarkerActive?.offsetHeight ?? 0;
    state.hoverMarkerHeight = scrubberMarkerHover?.offsetHeight ?? 0;
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
