import { type ChapterView, createChapterView } from "./chapter";
import { createLightbox } from "./lightbox";
import { createProgressBar } from "./progress-bar";
import { createReaderBar } from "./reader-bar";
import { createScrubber } from "./scrubber";
import { h } from "@/core/dom-utils";
import { initAutoScroll } from "./auto-scroll";

export type Viewer = Pick<ChapterView, "element" | "load" | "reload" | "saveScrollPosition" | "stepImage" | "unload">;

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

    return { ...chapters, element };
}
