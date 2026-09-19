import { CurrentSettings, PersistState, UIState, ViewerState } from "@/state";
import { goToChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./chapter";
import { h, requireElement, setDatasetFlag, setText, setVisible } from "@/core/dom-utils";
import { createIconButton } from "@/core/icons";
import { observeHoverReveal } from "@/core/hover-reveal";

const navContainerElement = requireElement("#nav-container");
let pageIndicatorElement: HTMLElement | null = null;

function hideNav(): void {
    UIState.update("isNavVisible", false);
}

function refreshPageIndicator(): void {
    const total = ViewerState.activeChapter?.pageCount ?? 0;
    setText(pageIndicatorElement, total > 0 ? `${ViewerState.visibleImageIndex + 1} / ${total}` : "—");
}

export function initNavigation(): void {
    const iconOptions = { size: 17 };

    const firstBtn = createIconButton("ChevronsLeft", {
        className: "btn-icon",
        iconOptions,
        onClick: () => goToChapter(0),
        tooltip: "First chapter (h)",
    });
    const prevBtn = createIconButton("ChevronLeft", {
        className: "btn-icon",
        iconOptions,
        onClick: loadPreviousChapter,
        tooltip: "Previous chapter (Alt+Left)",
    });
    const nextBtn = createIconButton("ChevronRight", {
        className: "btn-icon",
        iconOptions,
        onClick: loadNextChapter,
        tooltip: "Next chapter (Alt+Right)",
    });
    const lastBtn = createIconButton("ChevronsRight", {
        className: "btn-icon",
        iconOptions,
        onClick: goToLastChapter,
        tooltip: "Last chapter (l)",
    });
    pageIndicatorElement = h("div", {
        className:
            "font-mono text-xs font-medium text-muted px-3 flex items-center justify-center min-w-[100px] whitespace-nowrap",
    });
    refreshPageIndicator();

    const centerGroup = h("div", { className: "flex items-center gap-0.5" }, prevBtn, pageIndicatorElement, nextBtn);

    navContainerElement.replaceChildren(firstBtn, centerGroup, lastBtn);

    observeHoverReveal(
        (e) => navContainerElement.contains(e.target as Node),
        () => UIState.update("isNavVisible", true),
        hideNav,
    );
    UIState.onChange("isNavVisible", (visible) => setDatasetFlag(navContainerElement, "visible", visible), {
        immediate: true,
    });
    PersistState.onChange("currentMangaId", (mangaId) => {
        if (mangaId === null) hideNav();
    });
    CurrentSettings.onChange("navBarEnabled", applyNavBarEnabled, { immediate: true });
    ViewerState.onChange("activeChapter", refreshPageIndicator);
    ViewerState.onChange("visibleImageIndex", refreshPageIndicator);
}

function applyNavBarEnabled(enabled: boolean): void {
    if (enabled) {
        setVisible(navContainerElement, true);
    } else {
        hideNav();
        setVisible(navContainerElement, false);
    }
}
