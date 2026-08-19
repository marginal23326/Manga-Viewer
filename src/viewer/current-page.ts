import { emitAppEvent } from "@/core/app-events";
import { getMangaImages } from "@/core/dom-utils";
import { toInt } from "@/core/utils";

let visibleImageIndex = 0;
let visibleImageObserver: IntersectionObserver | null = null;

export function getVisibleImageIndex(): number {
    return visibleImageIndex;
}

export function setVisibleImageIndex(index: number): void {
    if (index === visibleImageIndex) return;
    visibleImageIndex = index;
    emitAppEvent("visibleImageChanged", { imageIndex: index });
}

export function resetVisibleImageIndex(): void {
    visibleImageIndex = 0;
}

export function setupVisibleImageObserver(): void {
    teardownVisibleImageObserver();
    const options: IntersectionObserverInit = {
        root: null,
        rootMargin: `-${window.innerHeight / 2 - 1}px 0px -${window.innerHeight / 2}px 0px`,
        threshold: 0,
    };
    visibleImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                setVisibleImageIndex(toInt((entry.target as HTMLElement).dataset.index));
            }
        });
    }, options);
    getMangaImages().forEach((img) => visibleImageObserver?.observe(img));
}

export function teardownVisibleImageObserver(): void {
    visibleImageObserver?.disconnect();
    visibleImageObserver = null;
}
