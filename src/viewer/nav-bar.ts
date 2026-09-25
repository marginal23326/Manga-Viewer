import { CurrentSettings, PersistState, UIState, ViewerState } from "@/state";
import { goToChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./chapter";
import { h, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { createIconButton } from "@/core/icons";
import { observeHoverReveal } from "@/core/hover-reveal";

export const navContainerElement = h("nav", {
    className:
        "fixed top-5 left-1/2 -translate-x-1/2 px-2 py-2 bg-paper/85 dark:bg-ink/85 backdrop-blur-xl rounded-full border divider-line shadow-[0_8px_24px_-8px] shadow-ink/25 dark:shadow-black/60 z-30 flex items-center gap-1 transition-all duration-300 ease-out",
    id: "nav-container",
});

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
    UIState.onChange("isNavVisible", (visible) => toggleClass(navContainerElement, "is-visible", visible), {
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
