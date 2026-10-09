import { CurrentSettings, type MangaProgress, ViewerState } from "@/state";
import { currentScrollAnchor, mountVirtualizer } from "./virtualizer";
import { type State } from "@/core/create-state";
import { debounce } from "@/core/utils";
import { h } from "@/core/dom-utils";

type ImageClickZone = "bottom" | "middle" | "top";

function getImageClickZone(clientY: number): ImageClickZone {
    const third = innerHeight / 3;
    if (clientY < third) return "top";
    if (clientY > third * 2) return "bottom";
    return "middle";
}

function handleImageClick(event: MouseEvent): void {
    const zone = getImageClickZone(event.clientY);
    if (zone === "middle") return;

    const direction = zone === "top" ? -1 : 1;
    scrollTo({
        behavior: "smooth",
        top: Math.max(0, scrollY + direction * CurrentSettings.scrollAmount),
    });
}

export function createChapterView(): HTMLElement {
    const element = h("main", {
        className: "w-full px-2 sm:px-8 py-8 flex flex-col items-center bg-transparent relative z-10",
        id: "image-container",
    });
    let mounted: { destroy: () => void; progress: State<MangaProgress> } | null = null;

    function saveScrollPosition(): void {
        const anchor = currentScrollAnchor();
        if (anchor) mounted?.progress.update("scrollAnchor", anchor);
    }

    ViewerState.onChange("activeChapter", (context) => {
        saveScrollPosition();
        mounted?.destroy();
        mounted = null;

        const progress = ViewerState.session?.progress;
        if (!context || !progress) return;
        mounted = {
            destroy: mountVirtualizer({ container: element, context }),
            progress,
        };
    });

    element.addEventListener("click", (event) => {
        if (event.target instanceof HTMLImageElement) handleImageClick(event);
    });
    element.addEventListener("dblclick", (event) => {
        if (event.target instanceof HTMLImageElement && getImageClickZone(event.clientY) === "middle") {
            ViewerState.update("lightboxIndex", Number(event.target.dataset.index));
        }
    });

    addEventListener("scroll", debounce(saveScrollPosition, 300), { passive: true });
    addEventListener("pagehide", saveScrollPosition, { capture: true });

    return element;
}
