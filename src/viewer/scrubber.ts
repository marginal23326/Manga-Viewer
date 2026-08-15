import { DOM, addClass, removeClass, setText, setVisible } from "@/core/dom-utils";
import { debounce, getChapterBounds, getMangaImages, mapWithConcurrency, scrollToView, toInt } from "@/core/utils";
import Config from "@/core/config";
import type { Manga } from "@/types";
import { emitAppEvent } from "@/core/app-events";
import { getCurrentManga } from "@/state/manga-library";
import { iconSvg } from "@/core/icons";
import { loadImage } from "@/viewer/image-loader";

let scrubberParent: HTMLElement | null = null;
let scrubberTrack: HTMLElement | null = null;
let scrubberPreview: HTMLElement | null = null;
let scrubberMarkerActive: HTMLElement | null = null;
let scrubberMarkerHover: HTMLElement | null = null;
let scrubberIcon: HTMLElement | null = null;

interface ScrubberState {
    activeMarkerHeight: number;
    currentChapterIndex: number;
    hoverImageIndex: number;
    hoverMarkerHeight: number;
    isActive: boolean;
    isDragging: boolean;
    isEnabled: boolean;
    isVisible: boolean;
    mainImages: HTMLImageElement[];
    previewImages: HTMLImageElement[];
    previewScrollHeight: number;
    screenHeight: number;
    trackHeight: number;
    visibleImageIndex: number;
}

const state: ScrubberState = {
    activeMarkerHeight: 0,
    currentChapterIndex: -1,
    hoverImageIndex: 0,
    hoverMarkerHeight: 0,
    isActive: false,
    isDragging: false,
    isEnabled: true,
    isVisible: false,
    mainImages: [],
    previewImages: [],
    previewScrollHeight: 0,
    screenHeight: window.innerHeight,
    trackHeight: 0,
    visibleImageIndex: 0,
};

function setScrubberVisibility(visible: boolean): void {
    setVisible(scrubberParent, visible, "flex");
    setVisible(scrubberIcon, visible);
}

export function initScrubber(chapterIndex: number): void {
    ({ scrubberParent, scrubberTrack, scrubberPreview, scrubberMarkerActive, scrubberMarkerHover, scrubberIcon } = DOM);

    if (
        !scrubberParent ||
        !scrubberTrack ||
        !scrubberPreview ||
        !scrubberMarkerActive ||
        !scrubberMarkerHover ||
        !scrubberIcon
    ) {
        return;
    }

    if (!state.isEnabled) {
        setScrubberVisibility(false);
        return;
    }

    setScrubberVisibility(true);

    state.previewImages = [];
    state.mainImages = getMangaImages();
    state.currentChapterIndex = chapterIndex;
    state.screenHeight = window.innerHeight;
    state.trackHeight = scrubberTrack.offsetHeight;
    state.activeMarkerHeight = scrubberMarkerActive.offsetHeight;
    state.hoverMarkerHeight = scrubberMarkerHover.offsetHeight;
    state.visibleImageIndex = 0;
    state.hoverImageIndex = 0;
    state.isVisible = false;
    state.isActive = false;
    state.isDragging = false;

    scrubberPreview.innerHTML = "";
    addScrubberListeners();
    buildPreviewImages(chapterIndex);
    updateActiveMarkerPosition();
    hideScrubberUI(true);
}

export function teardownScrubber(): void {
    removeScrubberListeners();
    state.previewImages = [];
    state.mainImages = [];
    if (scrubberPreview) scrubberPreview.innerHTML = "";
    hideScrubberUI(true);
}

export function setScrubberEnabled(enabled: boolean): void {
    state.isEnabled = enabled;
    setScrubberVisibility(enabled);
    if (!enabled) {
        hideScrubberUI(true);
    }
}

function buildPreviewImages(chapterIndex: number): void {
    const previewContainer = scrubberPreview;
    const manga = getCurrentManga();
    if (!previewContainer || chapterIndex < 0 || !manga) return;

    void loadPreviewImages(manga, chapterIndex, previewContainer);
}

async function loadPreviewImages(manga: Manga, chapterIndex: number, previewContainer: HTMLElement): Promise<void> {
    const { start, end } = getChapterBounds(manga, chapterIndex);
    const fragment = document.createDocumentFragment();
    const imageIndices = Array.from({ length: end - start }, (_, i) => start + i + 1);

    const images = await mapWithConcurrency(imageIndices, Config.IMAGE_LOAD_CONCURRENCY, (imageIndex) =>
        loadImage(manga.imagesFullPath, imageIndex),
    );

    images.forEach((img, index) => {
        if (!img) return;
        addClass(
            img,
            "scrubber-preview-image block h-32 sm:h-40 md:h-48 w-auto brutal-border transition-all duration-75",
        );
        img.dataset.index = String(index);
        state.previewImages.push(img);
        fragment.append(img);
    });

    previewContainer.append(fragment);
    state.previewScrollHeight = previewContainer.scrollHeight;
}

function addScrubberListeners(): void {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.addEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.addEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.addEventListener("mousemove", handleMouseMove);
    scrubberTrack.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("resize", debouncedUpdateScreenHeight);
}

function removeScrubberListeners(): void {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.removeEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.removeEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.removeEventListener("mousemove", handleMouseMove);
    scrubberTrack.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
    window.removeEventListener("resize", debouncedUpdateScreenHeight);
}

function handleMouseEnter(): void {
    state.isActive = true;
    showScrubberUI();
    emitAppEvent("navHideRequested");
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
    // Add active dragging cursor to track
    addClass(scrubberTrack, "cursor-grabbing");
    updateHoverState(event.clientY);
    const target = state.mainImages[state.hoverImageIndex];
    if (target) {
        scrollToView(target);
    }
    event.preventDefault();
}

function handleWindowMouseMove(event: MouseEvent): void {
    if (!state.isDragging) return;
    updateHoverState(event.clientY);
    const target = state.mainImages[state.hoverImageIndex];
    if (target) {
        scrollToView(target, "instant");
        updateScrubberState({ visibleImageIndex: state.hoverImageIndex });
    }
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

function updateHoverState(clientY: number): void {
    if (!state.isVisible || state.previewImages.length === 0 || !scrubberMarkerHover) return;
    const markerHover = scrubberMarkerHover;

    const margin = 16;
    const ratio = Math.max(0, Math.min(1, (clientY - margin) / (window.innerHeight - 2 * margin)));
    const calculatedIndex = Math.floor(ratio * state.previewImages.length);
    state.hoverImageIndex = Math.min(calculatedIndex, state.previewImages.length - 1);

    const hoverMarkerY = ratio * state.trackHeight - state.hoverMarkerHeight / 2;
    markerHover.style.transform = `translateY(${Math.max(0, Math.min(state.trackHeight - state.hoverMarkerHeight, hoverMarkerY))}px)`;

    // System-style indexing (e.g. 001 instead of 1)
    setText(markerHover, (state.hoverImageIndex + 1).toString().padStart(2, "0"));

    if (state.previewScrollHeight > state.trackHeight && scrubberPreview) {
        const targetScroll = ratio * state.previewScrollHeight - clientY;
        scrubberPreview.style.transform = `translateY(${-targetScroll}px)`;
    }

    // High-contrast highlighting for the preview image
    state.previewImages.forEach((img, index) => {
        if (index === state.hoverImageIndex) {
            // Select state: Thick accent border and slight pop
            img.style.borderColor = "var(--color-accent)";
            img.style.transform = "scale(1.05) translateX(-8px)";
            img.style.zIndex = "10";
        } else {
            // Reset state
            img.style.borderColor = "";
            img.style.transform = "";
            img.style.zIndex = "";
        }
    });
}

function updateActiveMarkerPosition(): void {
    if (!scrubberMarkerActive) return;

    if (state.mainImages.length <= 1) {
        scrubberMarkerActive.style.transform = "translateY(0px)";
        setText(scrubberMarkerActive, state.mainImages.length > 0 ? "01" : "--");
        return;
    }

    const visualIndex = Math.max(
        0,
        state.mainImages.findIndex((img) => toInt(img.dataset.index) === state.visibleImageIndex),
    );

    const ratio = (visualIndex + 0.5) / state.previewImages.length;
    const activeMarkerY = ratio * state.trackHeight - state.activeMarkerHeight / 2;
    scrubberMarkerActive.style.transform = `translateY(${Math.max(0, Math.min(state.trackHeight - state.activeMarkerHeight, activeMarkerY))}px)`;
    setText(scrubberMarkerActive, (visualIndex + 1).toString().padStart(2, "0"));
}

interface ScrubberStateUpdate {
    visibleImageIndex?: number;
}

export function updateScrubberState(newState: ScrubberStateUpdate): void {
    let changed = false;
    if (Object.hasOwn(newState, "visibleImageIndex") && state.visibleImageIndex !== newState.visibleImageIndex) {
        state.visibleImageIndex = newState.visibleImageIndex ?? 0;
        changed = true;
    }

    if (changed) {
        updateActiveMarkerPosition();
        emitAppEvent("visibleImageChanged", { imageIndex: state.visibleImageIndex });
    }
}

function updateScreenHeight(): void {
    state.screenHeight = window.innerHeight;
    state.trackHeight = scrubberTrack?.offsetHeight ?? 0;
    updateActiveMarkerPosition();
}
const debouncedUpdateScreenHeight = debounce(updateScreenHeight, 100);

export function getVisibleImageIndex(): number {
    return state.visibleImageIndex;
}

export function initScrubberIcon(): void {
    if (DOM.scrubberIcon) {
        const iconElement = iconSvg("ChevronsUpDown");
        DOM.scrubberIcon.append(iconElement);
    }
}
