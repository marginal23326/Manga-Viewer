import { CurrentSettings, ViewerState, getImageUrl } from "@/state";
import { createGenerationGuard, rafThrottle } from "@/core/utils";
import { h, setVisible } from "@/core/dom-utils";
import { pageForRatio, ratioForClientY, ratioForPage, totalPages } from "./navigation-position";
import type { ChapterContext } from "@/types";
import { scrollToPage } from "./virtualizer";

function setPosition(ratio: number, ...elements: HTMLElement[]): void {
    for (const element of elements) element.style.setProperty("--pos", String(ratio));
}

const pageLabel = (index: number): string => String(index + 1).padStart(2, "0");

export function createScrubber(): HTMLElement {
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
    const isVisible = (): boolean => Object.hasOwn(scrubberParent.dataset, "active");
    let hoverImageIndex = 0;

    const previewGuard = createGenerationGuard();
    let previewIndex = -1;

    function hidePreview(): void {
        previewGuard.next();
        previewIndex = -1;
        previewImg.removeAttribute("src");
        previewCard.toggleAttribute("data-visible", false);
    }

    function applyScrubberEnabled(enabled: boolean): void {
        setVisible(scrubberParent, enabled);
        if (!enabled) hideScrubberUI();
    }

    async function showPreview(context: ChapterContext, index: number): Promise<void> {
        previewIndex = index;
        previewCard.toggleAttribute("data-visible", true);

        const token = previewGuard.next();
        const url = await getImageUrl(context, index);
        if (!previewGuard.isCurrent(token) || !url) return;

        previewImg.src = url;
    }

    const throttledHover = rafThrottle(updateHoverState);
    const throttledDrag = rafThrottle((clientY: number) => {
        updateHoverState(clientY);
        scrollToPage(hoverImageIndex);
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
        scrollToPage(hoverImageIndex);
        event.preventDefault();
    }

    function hideScrubberUI(): void {
        hidePreview();
        scrubberParent.toggleAttribute("data-active", false);
    }

    function updateHoverState(clientY: number): void {
        const context = ViewerState.activeChapter;
        if (!isVisible() || !context || context.pageCount === 0) return;

        const ratio = ratioForClientY(clientY);
        hoverImageIndex = pageForRatio(ratio, context.pageCount);

        setPosition(ratio, scrubberMarkerHover, previewCard);
        scrubberMarkerHover.textContent = pageLabel(hoverImageIndex);

        if (hoverImageIndex !== previewIndex) void showPreview(context, hoverImageIndex);
    }

    function updateActiveMarkerPosition(): void {
        const pageCount = totalPages();
        const index = ViewerState.visibleImageIndex;
        setPosition(ratioForPage(index, pageCount), scrubberMarkerActive);
        scrubberMarkerActive.textContent = pageCount > 0 ? pageLabel(index) : "--";
    }

    CurrentSettings.onChange("scrubberEnabled", applyScrubberEnabled, { immediate: true });
    ViewerState.onChange("activeChapter", () => {
        isDragging = false;
        hideScrubberUI();
        updateActiveMarkerPosition();
    });
    ViewerState.onChange("visibleImageIndex", updateActiveMarkerPosition);
    scrubberTrack.addEventListener("pointerenter", () => scrubberParent.toggleAttribute("data-active", true));
    scrubberTrack.addEventListener("pointerleave", () => {
        if (!isDragging) hideScrubberUI();
    });
    scrubberTrack.addEventListener("pointermove", handlePointerMove);
    scrubberTrack.addEventListener("pointerdown", handlePointerDown);
    scrubberTrack.addEventListener("lostpointercapture", () => {
        isDragging = false;
    });
    return scrubberParent;
}
