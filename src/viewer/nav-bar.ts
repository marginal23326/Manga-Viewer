import { CurrentSettings, ViewerState } from "@/state";
import { goToChapter, goToLastChapter, loadNextChapter, loadPreviousChapter } from "./chapter";
import { h, setText, setVisible } from "@/core/dom-utils";
import { createIconButton } from "@/core/icons";

export function createNavBar(): HTMLElement {
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
    const pageIndicator = h("div", {
        className:
            "font-mono text-xs font-medium text-muted px-3 flex items-center justify-center min-w-[100px] whitespace-nowrap",
    });

    const centerGroup = h("div", { className: "flex items-center gap-0.5" }, prevBtn, pageIndicator, nextBtn);
    const element = h("nav", { id: "nav-container" }, firstBtn, centerGroup, lastBtn);

    CurrentSettings.onChange("navBarEnabled", (enabled) => setVisible(element, enabled), { immediate: true });
    ViewerState.onChange(
        ["activeChapter", "visibleImageIndex"],
        () => {
            const total = ViewerState.activeChapter?.pageCount ?? 0;
            setText(pageIndicator, total > 0 ? `${ViewerState.visibleImageIndex + 1} / ${total}` : "—");
        },
        { immediate: true },
    );

    return element;
}
