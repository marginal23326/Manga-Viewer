import { CurrentSettings, UIState, ViewerState, loadImage } from "@/state";
import { addClass, h, removeClass, setText, setVisible } from "@/core/dom-utils";
import { clamp, createGenerationGuard, debounce, rafThrottle } from "@/core/utils";
import { currentPageIndex, pageForRatio, ratioForClientY, ratioForPage } from "./navigation-position";
import type { ChapterContext } from "@/types";
import { scrollToActiveIndex } from "./virtualizer";

const previewImg = h("img", {
    alt: "",
    className:
        "block h-58 w-auto max-w-62 rounded-lg border-2 border-accent object-cover shadow-xl bg-ink/[0.04] dark:bg-white/[0.04]",
});
const previewCard = h(
    "div",
    {
        className: "absolute right-0 top-0 opacity-0 transition-opacity duration-150 pointer-events-none",
    },
    previewImg,
);
const previewViewport = h("div", { className: "relative mr-4 h-full pointer-events-none" }, previewCard);

const scrubberMarkerActive = h("div", {
    className:
        "hanko absolute -left-3 w-[calc(100%+24px)] h-9 text-[11px] shadow-[0_4px_12px_-2px_rgba(178,58,42,0.5)] transition-transform duration-75 ease-linear z-10",
});

const scrubberMarkerHover = h("div", {
    className:
        "surface absolute -left-3 w-[calc(100%+24px)] h-9 rounded-full shadow-lg text-ink dark:text-paper font-mono text-[11px] font-medium flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-150 z-0",
});

const scrubberTrack = h(
    "div",
    {
        className:
            "relative h-full w-10 lg:w-12 pointer-events-auto cursor-grab active:cursor-grabbing border-l-2 border-ink/6 dark:border-white/8 hover:border-accent/40 transition-colors before:content-[''] before:absolute before:inset-y-0 before:-left-10 before:w-10",
    },
    scrubberMarkerActive,
    scrubberMarkerHover,
);

export const scrubberParent = h(
    "div",
    {
        className:
            "fixed right-0 top-0 h-full z-20 flex items-center pl-8 pr-6 pointer-events-none opacity-0 transition-opacity duration-300",
    },
    previewViewport,
    scrubberTrack,
);

let isActive = false;
let isDragging = false;
let isVisible = false;
let trackHeight = 0;
let activeMarkerHeight = 0;
let hoverMarkerHeight = 0;
let hoverMarkerY = 0;
let hoverImageIndex = 0;

const EMPTY_CHAPTER_CONTEXT: ChapterContext = { chapterIndex: 0, mangaId: "", pageCount: 0 };

let chapter: ChapterContext = EMPTY_CHAPTER_CONTEXT;
const previewGuard = createGenerationGuard();
let previewIndex = -1;

function setScrubberVisibility(visible: boolean): void {
    setVisible(scrubberParent, visible);
}

function hidePreview(): void {
    previewGuard.next();
    previewIndex = -1;
    previewImg.removeAttribute("src");
    addClass(previewCard, "opacity-0");
}

function resetScrubberState(): void {
    chapter = EMPTY_CHAPTER_CONTEXT;
    hoverImageIndex = 0;
    hoverMarkerY = 0;
    isActive = isDragging = false;
    hideScrubberUI(true);
}

function applyScrubberEnabled(enabled: boolean): void {
    setScrubberVisibility(enabled);
    if (!enabled) {
        hideScrubberUI(true);
        return;
    }
    measureTrack();
    updateActiveMarkerPosition();
}

export function initScrubber(): void {
    CurrentSettings.onChange("scrubberEnabled", applyScrubberEnabled);
    ViewerState.onChange("activeChapter", (context) => {
        resetScrubberState();
        if (!context) return;

        chapter = context;
        applyScrubberEnabled(CurrentSettings.scrubberEnabled);
    });
    ViewerState.onChange("visibleImageIndex", updateActiveMarkerPosition);
    scrubberTrack.addEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.addEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.addEventListener("mousemove", handleMouseMove);
    scrubberTrack.addEventListener("mousedown", handleMouseDown);
    addEventListener("mousemove", handleWindowMouseMove);
    addEventListener("mouseup", handleWindowMouseUp);
    addEventListener("resize", debouncedHandleResize);
}

function positionPreviewCard(): void {
    const cardHeight = previewCard.offsetHeight;
    const maxTop = Math.max(0, trackHeight - cardHeight);
    const top =
        cardHeight > 0
            ? clamp(hoverMarkerY + hoverMarkerHeight / 2 - cardHeight / 2, 0, maxTop)
            : clamp(hoverMarkerY, 0, maxTop);
    previewCard.style.transform = `translateY(${top}px)`;
}

async function showPreview(index: number): Promise<void> {
    previewIndex = index;
    removeClass(previewCard, "opacity-0");
    positionPreviewCard();

    const token = previewGuard.current();
    const img = await loadImage(chapter, index);
    if (!previewGuard.isCurrent(token) || previewIndex !== index || !img) return;

    previewImg.src = img.src;
    positionPreviewCard();
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
    hidePreview();
    addClass(scrubberParent, "opacity-0");
    addClass(scrubberMarkerHover, "opacity-0");
}

function markerOffset(ratio: number, trackHeightPx: number, markerHeight: number): number {
    return clamp(ratio * trackHeightPx - markerHeight / 2, 0, trackHeightPx - markerHeight);
}

function updateHoverState(clientY: number): void {
    if (!isVisible || chapter.pageCount === 0) return;

    const ratio = ratioForClientY(clientY);
    const newHoverIndex = pageForRatio(ratio, chapter.pageCount);
    hoverImageIndex = newHoverIndex;

    hoverMarkerY = markerOffset(ratio, trackHeight, hoverMarkerHeight);
    scrubberMarkerHover.style.transform = `translateY(${hoverMarkerY}px)`;
    setText(scrubberMarkerHover, (newHoverIndex + 1).toString().padStart(2, "0"));

    positionPreviewCard();
    if (newHoverIndex !== previewIndex) void showPreview(newHoverIndex);
}

function updateActiveMarkerPosition(): void {
    if (chapter.pageCount <= 1) {
        scrubberMarkerActive.style.transform = "translateY(0px)";
        setText(scrubberMarkerActive, chapter.pageCount > 0 ? "01" : "--");
        return;
    }

    const visualIndex = currentPageIndex();
    const activeMarkerY = markerOffset(ratioForPage(visualIndex, chapter.pageCount), trackHeight, activeMarkerHeight);
    scrubberMarkerActive.style.transform = `translateY(${activeMarkerY}px)`;
    setText(scrubberMarkerActive, (visualIndex + 1).toString().padStart(2, "0"));
}

function measureTrack(): void {
    trackHeight = scrubberTrack.offsetHeight;
    activeMarkerHeight = scrubberMarkerActive.offsetHeight;
    hoverMarkerHeight = scrubberMarkerHover.offsetHeight;
}

function handleResize(): void {
    measureTrack();
    positionPreviewCard();
    updateActiveMarkerPosition();
}
const debouncedHandleResize = debounce(handleResize, 100);
