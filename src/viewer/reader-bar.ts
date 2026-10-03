import {
    CurrentProgress,
    CurrentSettings,
    PersistState,
    ViewerState,
    getCurrentManga,
    toggleToolbarPin,
} from "@/state";
import { IMAGE_FIT_OPTIONS, type ToolbarMode } from "@/types";
import { createIconButton, setIcon } from "@/core/icons";
import { goToChapter, loadNextChapter, loadPreviousChapter } from "./chapter";
import { h, setText, setVisible } from "@/core/dom-utils";
import { randomId, toInt } from "@/core/utils";
import { bind } from "@/core/binding";
import { createSegmentedControl } from "@/components/segmented-control";
import { createSelect } from "@/components/custom-select";
import { createStepper } from "@/components/stepper";
import { navigateTo } from "@/app/hash-route";
import { openSettings } from "@/settings";
import { toggleAutoScroll } from "./auto-scroll";
import { withShortcutHint } from "@/app/keymap";
import { zoomPercent } from "./zoom";

const PEEK_MS = 1000;
const ICON_LG = { size: 18 };
const ICON_MD = { size: 17 };
const ICON_SM = { size: 16 };

function createViewControl(): { button: HTMLButtonElement; popover: HTMLElement } {
    const id = `view-options-${randomId()}`;
    const anchorName = `--${id}`;

    const zoomRow = h(
        "div",
        { className: "flex items-center justify-between" },
        h("span", { className: "field-label" }, "Zoom"),
        createStepper(zoomPercent, { max: 500, min: 10, step: 5, unit: "%" }),
    );

    const fitRow = h(
        "div",
        { className: "flex flex-col gap-2" },
        h("span", { className: "field-label" }, "Image fit"),
        createSegmentedControl({
            binding: bind(CurrentSettings, "imageFit"),
            className: "w-full",
            items: IMAGE_FIT_OPTIONS,
        }),
    );

    const speedRow = h(
        "div",
        { className: "flex items-center justify-between pt-4 border-t" },
        h("span", { className: "field-label" }, "Auto-scroll speed"),
        createStepper(bind(CurrentSettings, "autoScrollSpeed"), { min: 10, step: 50, unit: "px/s" }),
    );

    const popover = h(
        "div",
        {
            className: "anchored-popover panel p-4",
            id,
            popover: "auto",
        },
        zoomRow,
        fitRow,
        speedRow,
    );
    popover.style.setProperty("position-anchor", anchorName);

    const button = createIconButton("SlidersHorizontal", { iconOptions: ICON_MD, tooltip: "View options" });
    button.setAttribute("popovertarget", id);
    button.style.setProperty("anchor-name", anchorName);
    popover.addEventListener("toggle", (event) => {
        button.setAttribute("aria-expanded", String(event.newState === "open"));
    });

    return { button, popover };
}

export function createReaderBar(): HTMLElement {
    const title = h("span", {
        className: "hidden sm:block min-w-0 truncate text-[15px] font-semibold tracking-tight",
    });
    const left = h(
        "div",
        { className: "flex items-center gap-1.5 min-w-0" },
        createIconButton("ArrowLeft", {
            iconOptions: ICON_LG,
            onClick: () => navigateTo({ name: "library" }),
            tooltip: withShortcutHint("Back to library", "escape"),
        }),
        title,
    );

    const chapterSelect = createSelect({
        onChange: (selectedValue) => goToChapter(toInt(selectedValue)),
        placeholder: "Chapter",
        width: "w-32",
    });
    const prevButton = createIconButton("ChevronLeft", {
        iconOptions: ICON_LG,
        onClick: loadPreviousChapter,
        tooltip: withShortcutHint("Previous chapter", "previousChapter"),
    });
    const nextButton = createIconButton("ChevronRight", {
        iconOptions: ICON_LG,
        onClick: loadNextChapter,
        tooltip: withShortcutHint("Next chapter", "nextChapter"),
    });
    const centre = h("div", { className: "flex items-center gap-0.5" }, prevButton, chapterSelect.element, nextButton);

    const pageIndicator = h("span", {
        className: "hidden sm:block px-2 min-w-16 text-center text-[13px] font-medium text-muted whitespace-nowrap",
    });

    // Tooltips for the two toggle buttons are set by their state subscribers below.
    const autoScrollButton = createIconButton("Play", { iconOptions: ICON_MD, onClick: toggleAutoScroll });
    const view = createViewControl();
    const settingsButton = createIconButton("Settings", {
        iconOptions: ICON_MD,
        onClick: openSettings,
        tooltip: withShortcutHint("Settings", "openSettings"),
    });
    const pinButton = createIconButton("Pin", {
        className: "btn-icon hidden sm:inline-flex",
        iconOptions: ICON_SM,
        onClick: toggleToolbarPin,
    });

    const right = h(
        "div",
        { className: "flex items-center justify-end gap-0.5" },
        pageIndicator,
        autoScrollButton,
        view.button,
        settingsButton,
        pinButton,
    );

    const surface = h(
        "div",
        { className: "reader-bar-surface bg-canvas/80 backdrop-blur-xl border-b" },
        h(
            "div",
            { className: "grid grid-cols-[1fr_auto_1fr] items-center gap-3 h-14 px-3 sm:px-4" },
            left,
            centre,
            right,
        ),
        view.popover,
    );
    const element = h("header", { id: "reader-bar" }, surface);

    function applyPinned(mode: ToolbarMode): void {
        const pinned = mode === "open";
        element.toggleAttribute("data-pinned", pinned);
        pinButton.setAttribute("aria-pressed", String(pinned));
        pinButton.title = withShortcutHint(pinned ? "Let toolbar hide" : "Keep toolbar visible", "toggleToolbarPin");
        setIcon(pinButton, pinned ? "PinOff" : "Pin", ICON_SM);
    }

    function syncMangaContext(): void {
        const manga = getCurrentManga();
        if (!manga) return;

        setText(title, manga.title);
        title.title = manga.title;

        const hasChapters = manga.totalChapters > 0;
        setVisible(centre, hasChapters);
        if (!hasChapters) return;

        chapterSelect.setOptions(
            Array.from({ length: manga.totalChapters }, (_, i) => ({ text: `Chapter ${i + 1}`, value: String(i) })),
            String(CurrentProgress.currentChapter),
        );
        prevButton.disabled = CurrentProgress.currentChapter <= 0;
        nextButton.disabled = CurrentProgress.currentChapter >= manga.totalChapters - 1;
    }

    function syncPageIndicator(): void {
        const total = ViewerState.activeChapter?.pageCount ?? 0;
        setText(pageIndicator, total > 0 ? `${ViewerState.visibleImageIndex + 1} / ${total}` : "—");
    }

    let peekTimer: number | undefined;
    let peekedManga: string | null = null;
    function peek(mangaId: string): void {
        if (peekedManga === mangaId) return;
        peekedManga = mangaId;
        element.dataset.peek = "";
        clearTimeout(peekTimer);
        peekTimer = window.setTimeout(() => delete element.dataset.peek, PEEK_MS);
    }

    CurrentSettings.onChange("toolbarEnabled", (enabled) => setVisible(element, enabled), { immediate: true });
    CurrentProgress.onChange("currentChapter", syncMangaContext);
    PersistState.onChange("mangaList", syncMangaContext);
    ViewerState.onChange("currentMangaId", (id) => {
        if (id === null) peekedManga = null;
        else syncMangaContext();
    });
    ViewerState.onChange("activeChapter", (context) => {
        if (context) peek(context.mangaId);
    });
    ViewerState.onChange(["activeChapter", "visibleImageIndex"], syncPageIndicator, { immediate: true });
    PersistState.onChange("toolbarMode", applyPinned, { immediate: true });
    ViewerState.onChange(
        "autoScroll",
        (running) => {
            setIcon(autoScrollButton, running ? "Pause" : "Play", ICON_MD);
            autoScrollButton.setAttribute("aria-pressed", String(running));
            autoScrollButton.title = withShortcutHint(`${running ? "Pause" : "Start"} auto-scroll`, "toggleAutoScroll");
        },
        { immediate: true },
    );

    return element;
}
