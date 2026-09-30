import { CurrentSettings, ViewerState, loadPageImage } from "@/state";
import { addClass, h, removeClass, setText, setVisible } from "@/core/dom-utils";
import { createGenerationGuard, rafThrottle } from "@/core/utils";
import { currentPageIndex, pageForRatio, ratioForClientY, ratioForPage } from "./navigation-position";
import type { ChapterContext } from "@/types";
import { scrollToActiveIndex } from "./virtualizer";

const previewImg = h("img", {
    alt: "",
    className:
        "block h-(--card-h) w-auto max-w-62 rounded-lg border-2 border-accent object-cover shadow-xl bg-ink/[0.04] dark:bg-white/[0.04]",
});
const previewCard = h(
    "div",
    {
        className: "scrubber-card absolute right-0 opacity-0 transition-opacity duration-150 pointer-events-none",
    },
    previewImg,
);
const previewViewport = h("div", { className: "relative mr-4 h-full pointer-events-none" }, previewCard);

const scrubberMarkerActive = h("div", {
    className:
        "hanko scrubber-marker absolute -left-3 w-[calc(100%+24px)] text-[11px] shadow-[0_4px_12px_-2px_rgba(178,58,42,0.5)] transition-[top] duration-75 ease-linear z-10",
});

const scrubberMarkerHover = h("div", {
    className:
        "surface scrubber-marker absolute -left-3 w-[calc(100%+24px)] rounded-full shadow-lg font-mono text-[11px] font-medium flex items-center justify-center pointer-events-none opacity-0 transition-opacity duration-150 z-0",
});

const scrubberTrack = h(
    "div",
    {
        className:
            "relative h-full w-10 lg:w-12 pointer-events-auto touch-none select-none cursor-grab active:cursor-grabbing border-l-2 border-ink/6 dark:border-white/8 hover:border-accent/40 transition-colors before:content-[''] before:absolute before:inset-y-0 before:-left-10 before:w-10",
    },
    scrubberMarkerActive,
    scrubberMarkerHover,
);

export const scrubberParent = h(
    "div",
    {
        className:
            "fixed right-0 top-0 h-full z-20 flex items-center pl-8 pr-6 pointer-events-none opacity-0 transition-opacity duration-300",
        id: "scrubber",
    },
    previewViewport,
    scrubberTrack,
);

let isDragging = false;
let isVisible = false;
let hoverImageIndex = 0;

const previewGuard = createGenerationGuard();
let previewIndex = -1;

function hidePreview(): void {
    previewGuard.next();
    previewIndex = -1;
    previewImg.removeAttribute("src");
    addClass(previewCard, "opacity-0");
}

function resetScrubberState(): void {
    hoverImageIndex = 0;
    isDragging = false;
    hideScrubberUI(true);
}

function applyScrubberEnabled(enabled: boolean): void {
    setVisible(scrubberParent, enabled);
    if (!enabled) hideScrubberUI(true);
}

// Layout lives in CSS: `--pos` (0-1) is all the markers and the preview card need.
function setPosition(ratio: number, ...elements: HTMLElement[]): void {
    for (const element of elements) element.style.setProperty("--pos", String(ratio));
}

export function initScrubber(): void {
    CurrentSettings.onChange("scrubberEnabled", applyScrubberEnabled, { immediate: true });
    ViewerState.onChange("activeChapter", () => {
        resetScrubberState();
        updateActiveMarkerPosition();
    });
    ViewerState.onChange("visibleImageIndex", updateActiveMarkerPosition);
    scrubberTrack.addEventListener("pointerenter", showScrubberUI);
    scrubberTrack.addEventListener("pointerleave", handlePointerLeave);
    scrubberTrack.addEventListener("pointermove", handlePointerMove);
    scrubberTrack.addEventListener("pointerdown", handlePointerDown);
    scrubberTrack.addEventListener("lostpointercapture", () => {
        isDragging = false;
    });
}

async function showPreview(context: ChapterContext, index: number): Promise<void> {
    previewIndex = index;
    removeClass(previewCard, "opacity-0");

    const token = previewGuard.current();
    const data = await loadPageImage(context, index);
    if (!previewGuard.isCurrent(token) || previewIndex !== index || !data) return;

    previewImg.src = data.url;
}

function handlePointerLeave(): void {
    if (!isDragging) hideScrubberUI();
}

const throttledHover = rafThrottle(updateHoverState);
const throttledDrag = rafThrottle((clientY: number) => {
    updateHoverState(clientY);
    scrollToActiveIndex(hoverImageIndex);
});

function handlePointerMove(event: PointerEvent): void {
    if (isDragging) throttledDrag(event.clientY);
    else throttledHover(event.clientY);
}

function handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    isDragging = true;
    scrubberTrack.setPointerCapture(event.pointerId);
    updateHoverState(event.clientY);
    scrollToActiveIndex(hoverImageIndex);
    event.preventDefault();
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

function updateHoverState(clientY: number): void {
    const context = ViewerState.activeChapter;
    if (!isVisible || !context || context.pageCount === 0) return;

    const ratio = ratioForClientY(clientY);
    const newHoverIndex = pageForRatio(ratio, context.pageCount);
    hoverImageIndex = newHoverIndex;

    setPosition(ratio, scrubberMarkerHover, previewCard);
    setText(scrubberMarkerHover, (newHoverIndex + 1).toString().padStart(2, "0"));

    if (newHoverIndex !== previewIndex) void showPreview(context, newHoverIndex);
}

function updateActiveMarkerPosition(): void {
    const pageCount = ViewerState.activeChapter?.pageCount ?? 0;
    if (pageCount <= 1) {
        setPosition(0, scrubberMarkerActive);
        setText(scrubberMarkerActive, pageCount > 0 ? "01" : "--");
        return;
    }

    const visualIndex = currentPageIndex();
    setPosition(ratioForPage(visualIndex, pageCount), scrubberMarkerActive);
    setText(scrubberMarkerActive, (visualIndex + 1).toString().padStart(2, "0"));
}
