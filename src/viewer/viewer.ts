import { type ChapterView, createChapterView } from "./chapter";
import { h, setVisible } from "@/core/dom-utils";
import { ViewerState } from "@/state";
import { createLightbox } from "./lightbox";
import { createProgressBar } from "./progress-bar";
import { createReaderBar } from "./reader-bar";
import { createScrubber } from "./scrubber";
import { initAutoScroll } from "./auto-scroll";

export type Viewer = Pick<ChapterView, "element" | "load" | "reload" | "stepImage" | "unload"> & {
    isLightboxOpen: () => boolean;
};

export function createViewer(): Viewer {
    const chapters = createChapterView();
    initAutoScroll();

    const lightbox = createLightbox(chapters.element, chapters.scrollToIndex);

    const element = h(
        "div",
        { className: "flex flex-col items-center relative", hidden: true, id: "viewer-container" },
        createProgressBar(chapters.scrollToIndex),
        createReaderBar(),
        chapters.element,
        createScrubber(chapters.scrollToIndex),
        lightbox.element,
    );

    ViewerState.onChange("session", (session) => setVisible(element, session !== null));

    return {
        ...chapters,
        element,
        isLightboxOpen: () => lightbox.element.open,
        stepImage: (direction) => (lightbox.element.open ? lightbox.step(direction) : chapters.stepImage(direction)),
    };
}
