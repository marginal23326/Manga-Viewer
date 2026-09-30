import { type ChapterView, createChapterView } from "./chapter";
import { createLightbox } from "./lightbox";
import { createNavBar } from "./nav-bar";
import { createProgressBar } from "./progress-bar";
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
        chapters.element,
        createNavBar(),
        createScrubber(chapters.scrollToIndex),
        createLightbox(chapters),
    );

    return { ...chapters, element };
}
