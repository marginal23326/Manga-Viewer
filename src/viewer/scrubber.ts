import { CurrentSettings, ViewerState, getImageUrl } from "@/state";
import { createGenerationGuard, rafThrottle } from "@/core/utils";
import { currentPageIndex, pageForRatio, ratioForClientY, ratioForPage } from "./navigation-position";
import { h, setText, setVisible } from "@/core/dom-utils";
import type { ChapterContext } from "@/types";
import type { ScrollToIndex } from "./chapter";

function setPosition(ratio: number, ...elements: HTMLElement[]): void {
    for (const element of elements) element.style.setProperty("--pos", String(ratio));
}

export function createScrubber(scrollToIndex: ScrollToIndex): HTMLElement {
    const previewImg = h("img", {
        alt: "",
        className:
            "block h-(--card-h) w-auto max-w-62 rounded-md object-cover shadow-float ring-1 ring-fg/20 bg-surface",
    });
    const previewCard = h(
        "div",
        {
            className:
                "scrubber-card absolute right-0 opacity-0 data-visible:opacity-100 transition-opacity duration-150 pointer-events-none",
        },
        previewImg,
    );
    const previewViewport = h("div", { className: "relative mr-3 h-full pointer-events-none" }, previewCard);

    const scrubberMarkerActive = h("div", {
        className:
            "pill scrubber-marker absolute left-1/2 -translate-x-1/2 w-9 text-[11px] shadow-xs transition-[top] duration-75 ease-linear z-10",
    });

    const scrubberMarkerHover = h("div", {
        className:
            "surface scrubber-marker absolute left-1/2 -translate-x-1/2 w-9 rounded-full shadow-float text-[11px] font-medium flex items-center justify-center pointer-events-none opacity-0 group-data-active:opacity-100 transition-opacity duration-150 z-20",
    });

    const scrubberTrack = h(
        "div",
        {
            className:
                "relative h-full w-9 pointer-events-auto touch-none select-none cursor-grab active:cursor-grabbing before:content-[''] before:absolute before:inset-y-0 before:-left-10 before:w-10",
        },
        h("div", {
            className: "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-fg/15",
        }),
        scrubberMarkerActive,
        scrubberMarkerHover,
    );

    const scrubberParent = h(
        "div",
        {
            className:
                "group fixed right-0 top-0 h-full z-20 flex items-center py-4 pl-8 pr-2 pointer-events-none opacity-0 data-active:opacity-100 transition-opacity duration-200",
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
        previewCard.toggleAttribute("data-visible", false);
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

    async function showPreview(context: ChapterContext, index: number): Promise<void> {
        previewIndex = index;
        previewCard.toggleAttribute("data-visible", true);

        const token = previewGuard.current();
        const url = await getImageUrl(context, index);
        if (!previewGuard.isCurrent(token) || previewIndex !== index || !url) return;

        previewImg.src = url;
    }

    function handlePointerLeave(): void {
        if (!isDragging) hideScrubberUI();
    }

    const throttledHover = rafThrottle(updateHoverState);
    const throttledDrag = rafThrottle((clientY: number) => {
        updateHoverState(clientY);
        scrollToIndex(hoverImageIndex);
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
        scrollToIndex(hoverImageIndex);
        event.preventDefault();
    }

    function showScrubberUI(): void {
        if (isVisible) return;
        isVisible = true;
        scrubberParent.toggleAttribute("data-active", true);
    }

    function hideScrubberUI(force = false): void {
        if (!isVisible && !force) return;
        isVisible = false;
        hidePreview();
        scrubberParent.toggleAttribute("data-active", false);
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
    return scrubberParent;
}
