import { h, setVisible } from "@/core/dom-utils";
import { ViewerState } from "@/state";
import { createChapterView } from "./chapter";
import { createLightbox } from "./lightbox";
import { createProgressBar } from "./progress-bar";
import { createReaderBar } from "./reader-bar";
import { createScrubber } from "./scrubber";
import { initAutoScroll } from "./auto-scroll";

export function createViewer(): HTMLElement {
    initAutoScroll();

    const element = h(
        "div",
        { className: "flex flex-col items-center relative", hidden: true, id: "viewer-container" },
        createProgressBar(),
        createReaderBar(),
        createChapterView(),
        createScrubber(),
        createLightbox(),
    );

    ViewerState.onChange("currentMangaId", (mangaId) => setVisible(element, mangaId !== null));

    return element;
}
