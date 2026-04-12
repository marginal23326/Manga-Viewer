import { DOM, $$, addClass, setText, removeClass, h } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";
import { debounce, getChapterBounds, scrollToView } from "../core/Utils";

import { getCurrentManga } from "./MangaManager";
import { hideNav } from "./NavigationManager";

let scrubberParent = null;
let scrubberTrack = null;
let scrubberPreview = null;
let scrubberMarkerActive = null;
let scrubberMarkerHover = null;
let scrubberIcon = null;

let state = {
    isActive: false,
    isDragging: false,
    isVisible: false,
    isEnabled: true,
    previewImages: [],
    mainImages: [],
    screenHeight: window.innerHeight,
    trackHeight: 0,
    previewScrollHeight: 0,
    activeMarkerHeight: 0,
    hoverMarkerHeight: 0,
    currentChapterIndex: -1,
    visibleImageIndex: 0,
    hoverImageIndex: 0,
};

export function initScrubber(chapterIndex) {
    scrubberParent = DOM.scrubberParent;
    scrubberTrack = DOM.scrubberTrack;
    scrubberPreview = DOM.scrubberPreview;
    scrubberMarkerActive = DOM.scrubberMarkerActive;
    scrubberMarkerHover = DOM.scrubberMarkerHover;
    scrubberIcon = DOM.scrubberIcon;

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
        scrubberParent.style.display = "none";
        scrubberIcon.style.display = "none";
        return;
    }

    scrubberParent.style.display = "";
    scrubberIcon.style.display = "";

    state.previewImages = [];
    state.mainImages = $$("img.manga-image", DOM.imageContainer);
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

export function teardownScrubber() {
    removeScrubberListeners();
    state.previewImages = [];
    state.mainImages = [];
    if (scrubberPreview) scrubberPreview.innerHTML = "";
    hideScrubberUI(true);
}

export function setScrubberEnabled(enabled) {
    state.isEnabled = enabled;
    if (!enabled) {
        if (scrubberParent) scrubberParent.style.display = "none";
        if (scrubberIcon) scrubberIcon.style.display = "none";
        hideScrubberUI(true);
    } else {
        if (scrubberParent) scrubberParent.style.display = "";
        if (scrubberIcon) scrubberIcon.style.display = "";
    }
}

async function buildPreviewImages(chapterIndex) {
    const manga = getCurrentManga();
    if (!manga || !scrubberPreview || chapterIndex < 0) return;

    const { start, end } = getChapterBounds(manga, chapterIndex);
    const fragment = document.createDocumentFragment();
    const count = end - start;
    const concurrency = 4;

    const loadTasks = [];
    for (let i = 0; i < count; i++) {
        const imageIndex = start + i + 1;
        loadTasks.push({ index: i, imageIndex });
    }

    const processBatch = async (batch) => {
        return Promise.all(
            batch.map(async ({ index, imageIndex }) => {
                try {
                    const img = await loadImage(manga.imagesFullPath, imageIndex);
                    return { index, img };
                } catch {
                    return { index, img: null };
                }
            }),
        );
    };

    for (let i = 0; i < loadTasks.length; i += concurrency) {
        const batch = loadTasks.slice(i, i + concurrency);
        const results = await processBatch(batch);
        for (const { index, img } of results) {
            if (img) {
                addClass(
                    img,
                    "scrubber-preview-image block h-32 sm:h-40 md:h-48 w-auto brutal-border transition-all duration-75",
                );
                img.loading = "lazy";
                img.dataset.index = index;
                state.previewImages.push(img);
                fragment.appendChild(img);
            }
        }
    }

    scrubberPreview.appendChild(fragment);

    setTimeout(() => {
        state.previewScrollHeight = scrubberPreview.scrollHeight;
    }, 100);
}

function addScrubberListeners() {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.addEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.addEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.addEventListener("mousemove", handleMouseMove);
    scrubberTrack.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("resize", debouncedUpdateScreenHeight);
}

function removeScrubberListeners() {
    if (!scrubberTrack || !scrubberIcon) return;
    scrubberTrack.removeEventListener("mouseenter", handleMouseEnter);
    scrubberTrack.removeEventListener("mouseleave", handleMouseLeave);
    scrubberTrack.removeEventListener("mousemove", handleMouseMove);
    scrubberTrack.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleWindowMouseMove);
    window.removeEventListener("mouseup", handleWindowMouseUp);
    window.removeEventListener("resize", debouncedUpdateScreenHeight);
}

function handleMouseEnter() {
    state.isActive = true;
    showScrubberUI();
    hideNav();
}

function handleMouseLeave() {
    state.isActive = false;
    if (!state.isDragging) hideScrubberUI();
}

function handleMouseMove(event) {
    if (!state.isActive || state.isDragging) return;
    updateHoverState(event.clientY);
}

function handleMouseDown(event) {
    if (event.button !== 0) return;
    state.isDragging = true;
    // Add active dragging cursor to track
    addClass(scrubberTrack, "cursor-grabbing");
    updateHoverState(event.clientY);
    if (state.mainImages[state.hoverImageIndex]) {
        scrollToView(state.mainImages[state.hoverImageIndex]);
    }
    event.preventDefault();
}

function handleWindowMouseMove(event) {
    if (!state.isDragging) return;
    updateHoverState(event.clientY);
    if (state.mainImages[state.hoverImageIndex]) {
        scrollToView(state.mainImages[state.hoverImageIndex], "instant");
        updateScrubberState({ visibleImageIndex: state.hoverImageIndex });
    }
}

function handleWindowMouseUp(event) {
    if (event.button !== 0 || !state.isDragging) return;
    state.isDragging = false;
    removeClass(scrubberTrack, "cursor-grabbing");
    if (!state.isActive) hideScrubberUI();
}

function showScrubberUI() {
    if (!state.isVisible && scrubberParent) {
        state.isVisible = true;
        removeClass(scrubberParent, "opacity-0");
        removeClass(scrubberMarkerHover, "opacity-0");
    }
}

function hideScrubberUI(force = false) {
    if ((state.isVisible || force) && scrubberParent) {
        state.isVisible = false;
        addClass(scrubberParent, "opacity-0");
        addClass(scrubberMarkerHover, "opacity-0");
    }
}

function updateHoverState(clientY) {
    if (!state.isVisible || state.previewImages.length === 0) return;

    const margin = 16;
    const ratio = Math.max(0, Math.min(1, (clientY - margin) / (window.innerHeight - 2 * margin)));
    const calculatedIndex = Math.floor(ratio * state.previewImages.length);
    state.hoverImageIndex = Math.min(calculatedIndex, state.previewImages.length - 1);

    const hoverMarkerY = ratio * state.trackHeight - state.hoverMarkerHeight / 2;
    scrubberMarkerHover.style.transform = `translateY(${Math.max(0, Math.min(state.trackHeight - state.hoverMarkerHeight, hoverMarkerY))}px)`;

    // System-style indexing (e.g. 001 instead of 1)
    setText(scrubberMarkerHover, (state.hoverImageIndex + 1).toString().padStart(2, "0"));

    if (state.previewScrollHeight > state.trackHeight && scrubberPreview) {
        const targetScroll = ratio * state.previewScrollHeight - clientY;
        scrubberPreview.style.transform = `translateY(${-targetScroll}px)`;
    }

    // High-contrast highlighting for the preview image
    state.previewImages.forEach((img, index) => {
        if (!img) return;
        if (index === state.hoverImageIndex) {
            // Select state: Thick accent border and slight pop
            img.style.borderColor = "#FF3366";
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

function updateActiveMarkerPosition() {
    if (!state.mainImages || state.mainImages.length <= 1) {
        scrubberMarkerActive.style.transform = "translateY(0px)";
        setText(scrubberMarkerActive, state.mainImages?.length > 0 ? "01" : "--");
        return;
    }

    const visualIndex = Math.max(
        0,
        Array.from(state.mainImages).findIndex((img) => parseInt(img.dataset.index, 10) === state.visibleImageIndex),
    );

    const ratio = (visualIndex + 0.5) / state.previewImages.length;
    const activeMarkerY = ratio * state.trackHeight - state.activeMarkerHeight / 2;
    scrubberMarkerActive.style.transform = `translateY(${Math.max(0, Math.min(state.trackHeight - state.activeMarkerHeight, activeMarkerY))}px)`;
    setText(scrubberMarkerActive, (visualIndex + 1).toString().padStart(2, "0"));
}

export function updateScrubberState(newState) {
    let changed = false;
    if (
        Object.prototype.hasOwnProperty.call(newState, "visibleImageIndex") &&
        state.visibleImageIndex !== newState.visibleImageIndex
    ) {
        state.visibleImageIndex = newState.visibleImageIndex;
        changed = true;
    }

    if (changed) {
        updateActiveMarkerPosition();
    }
}

function updateScreenHeight() {
    state.screenHeight = window.innerHeight;
    state.trackHeight = scrubberTrack?.offsetHeight || 0;
    updateActiveMarkerPosition();
}
const debouncedUpdateScreenHeight = debounce(updateScreenHeight, 100);

export function getVisibleImageIndex() {
    return state.visibleImageIndex;
}

export function initScrubberManager() {
    if (DOM.scrubberIcon) {
        const iconElement = h("i", { "data-lucide": "chevrons-up-down", "stroke-width": "3" });
        DOM.scrubberIcon.appendChild(iconElement);
    }
}
