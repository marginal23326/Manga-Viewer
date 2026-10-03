import { type ChapterView, createChapterView } from "./chapter";
import { h, setVisible } from "@/core/dom-utils";
import { ViewerState } from "@/state";
import { createLightbox } from "./lightbox";
import { createProgressBar } from "./progress-bar";
import { createReaderBar } from "./reader-bar";
import { createScrubber } from "./scrubber";
import { initAutoScroll } from "./auto-scroll";

export type Viewer = Pick<ChapterView, "element" | "load" | "reload" | "stepImage" | "unload">;

export function createViewer(): Viewer {
    const chapters = createChapterView();
    initAutoScroll();

    const element = h(
        "div",
        { className: "flex flex-col items-center relative", hidden: true, id: "viewer-container" },
        createProgressBar(chapters.scrollToIndex),
        createReaderBar(),
        chapters.element,
        createScrubber(chapters.scrollToIndex),
        createLightbox(chapters.element, chapters.scrollToIndex),
    );

    ViewerState.onChange("currentMangaId", (mangaId) => setVisible(element, mangaId !== null));

    return { ...chapters, element };
}
