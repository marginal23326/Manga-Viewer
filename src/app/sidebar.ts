import { CurrentProgress, CurrentSettings, PersistState, ViewerState, getCurrentManga } from "@/state";
import { IMAGE_FIT_OPTIONS, type SidebarMode } from "@/types";
import { createIconButton, setIcon } from "@/core/icons";
import { formatZoomLevel, resetZoom, zoomIn, zoomOut } from "@/viewer/zoom";
import { h, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { autoScrollRunning } from "@/viewer/auto-scroll";
import { bind } from "@/core/binding";
import { createSegmentedControl } from "@/components/segmented-control";
import { createSelect } from "@/components/custom-select";
import { createStepper } from "@/components/stepper";
import { createThemeSegmentedControl } from "./theme";
import { createToggleSwitch } from "@/components/toggle-switch";
import { goToChapter } from "@/viewer/chapter";
import { navigateTo } from "./hash-route";
import { openSettings } from "@/settings";
import { toInt } from "@/core/utils";

export function toggleSidebarPin(): void {
    PersistState.update("sidebarMode", PersistState.sidebarMode === "open" ? "hover" : "open");
}

function createSectionLabel(text: string): HTMLHeadingElement {
    return h("h3", { className: "eyebrow" }, text);
}

function createSection(...children: HTMLElement[]): HTMLDivElement {
    return h("div", { className: "flex flex-col w-full mb-6 gap-2" }, ...children);
}

function createHeaderRow(tag: "div" | "label", label: string, control: HTMLElement): HTMLElement {
    return h(
        tag,
        { className: `flex items-center justify-between w-full${tag === "label" ? " cursor-pointer" : ""}` },
        createSectionLabel(label),
        control,
    );
}

function createZoomControls(): { element: HTMLDivElement; zoomLevelDisplay: HTMLSpanElement } {
    const zoomLevelDisplay = h(
        "span",
        { className: "font-mono text-xs font-medium text-muted tracking-wide" },
        formatZoomLevel(CurrentProgress.zoomLevel),
    );

    const header = createHeaderRow("div", "Zoom", zoomLevelDisplay);

    const buttonsContainer = h("div", {
        className: "flex flex-row items-center w-full rounded-full surface p-1 gap-0.5",
    });

    const zoomBtnClass = "btn-icon flex-1 w-auto!";

    buttonsContainer.append(
        createIconButton("ZoomOut", {
            className: zoomBtnClass,
            iconOptions: { size: 16 },
            onClick: zoomOut,
            tooltip: "Zoom out (-)",
        }),
        createIconButton("Undo2", {
            className: zoomBtnClass,
            iconOptions: { size: 16 },
            onClick: resetZoom,
            tooltip: "Reset (=)",
        }),
        createIconButton("ZoomIn", {
            className: zoomBtnClass,
            iconOptions: { size: 16 },
            onClick: zoomIn,
            tooltip: "Zoom in (+)",
        }),
    );

    return { element: createSection(header, buttonsContainer), zoomLevelDisplay };
}

function createImageFitControl(): HTMLDivElement {
    return createSection(
        createSectionLabel("Image fit"),
        createSegmentedControl({
            binding: bind(CurrentSettings, "imageFit"),
            className: "w-full",
            items: IMAGE_FIT_OPTIONS,
        }),
    );
}

function createAutoScrollControl(): HTMLDivElement {
    const speed = createStepper(bind(CurrentSettings, "autoScrollSpeed"), {
        className: "w-full",
        min: 10,
        step: 50,
        unit: "px/s",
    });
    autoScrollRunning.subscribe((running) => setVisible(speed, running));

    return createSection(createHeaderRow("label", "Auto scroll", createToggleSwitch(autoScrollRunning)), speed);
}

export function createSidebar(): [toggleContainer: HTMLElement, sidebar: HTMLElement] {
    const toggleButton = createIconButton("PanelLeft", {
        className: "btn-icon-solid",
        iconOptions: { size: 18 },
        onClick: toggleSidebarPin,
        tooltip: "Pin sidebar (Ctrl+B)",
    });
    const homeButton = createIconButton("Home", {
        className: "btn-icon-solid",
        iconOptions: { size: 18 },
        onClick: () => navigateTo({ name: "library" }),
        tooltip: "Return to library (Esc)",
    });
    const toggleContainer = h(
        "div",
        { className: "fixed top-5 left-5 z-50 flex flex-row gap-2", hidden: true, id: "sidebar-toggle-container" },
        toggleButton,
        homeButton,
    );

    const mangaTitle = h("div", {
        className: "w-full pb-4 mb-6 border-b text-[15px] font-semibold tracking-tight truncate",
    });

    const chapterSelect = createSelect({
        onChange: (selectedValue) => goToChapter(toInt(selectedValue)),
        placeholder: "Select chapter",
        scroll: true,
        searchable: true,
        width: "w-full",
    });
    const chapterSection = createSection(createSectionLabel("Chapter"), chapterSelect.element);

    const zoomControls = createZoomControls();

    const footer = h(
        "div",
        { className: "w-full flex items-center justify-between pt-4 mt-auto border-t" },
        createThemeSegmentedControl(),
        createIconButton("Settings", {
            className: "btn-icon",
            iconOptions: { size: 18 },
            onClick: openSettings,
            tooltip: "Settings (Shift+S)",
        }),
    );

    const sidebar = h(
        "aside",
        {
            className:
                "fixed top-0 left-0 h-full w-0 bg-paper/90 dark:bg-ink/90 border-r z-40 transition-all duration-300 ease-out flex flex-col items-center py-6 overflow-y-auto no-scrollbar",
            id: "sidebar",
        },
        mangaTitle,
        chapterSection,
        zoomControls.element,
        createImageFitControl(),
        createAutoScrollControl(),
        footer,
    );

    function applySidebarMode(mode: SidebarMode): void {
        const pinned = mode === "open";
        toggleButton.title = `${pinned ? "Unpin" : "Pin"} sidebar (Ctrl+B)`;
        setIcon(toggleButton, pinned ? "PanelLeftOpen" : "PanelLeft", { size: 18 });
        toggleClass(sidebar, "is-open", pinned);
    }

    function syncMangaContext(): void {
        const currentManga = getCurrentManga();
        if (!currentManga) return;

        setText(mangaTitle, currentManga.title);
        mangaTitle.title = currentManga.title;

        const hasChapters = currentManga.totalChapters > 0;
        setVisible(chapterSection, hasChapters);
        if (!hasChapters) return;

        chapterSelect.setOptions(
            Array.from({ length: currentManga.totalChapters }, (_, i) => ({
                text: `Chapter ${i + 1}`,
                value: String(i),
            })),
            String(CurrentProgress.currentChapter),
        );
    }

    function syncSidebarForView(mangaId: string | null): void {
        const showingViewer = mangaId !== null;
        setVisible(toggleContainer, showingViewer);

        if (showingViewer) {
            applySidebarMode(PersistState.sidebarMode);
            syncMangaContext();
        } else {
            toggleClass(sidebar, "is-open", false);
        }
    }

    CurrentProgress.onChange("currentChapter", syncMangaContext);
    PersistState.onChange("mangaList", syncMangaContext);
    CurrentProgress.onChange("zoomLevel", (zoomLevel) =>
        setText(zoomControls.zoomLevelDisplay, formatZoomLevel(zoomLevel)),
    );

    ViewerState.onChange("currentMangaId", syncSidebarForView, { immediate: true });
    PersistState.onChange("sidebarMode", applySidebarMode);

    return [toggleContainer, sidebar];
}
