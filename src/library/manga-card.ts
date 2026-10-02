import { addClass, h, removeClass, setText } from "@/core/dom-utils";
import { createIconButton, iconSvg } from "@/core/icons";
import { getSavedProgress, loadPageImage } from "@/state";
import type { Manga } from "@/types";
import { clamp } from "@/core/utils";

export interface MangaCardEventHandlers {
    onClick?: (manga: Manga) => void;
    onDelete?: (mangaId: string) => void;
    onEdit?: (manga: Manga) => void;
}

export interface MangaCard {
    element: HTMLDivElement;
    refreshCover: () => void;
    refreshProgress: () => void;
}

const OVERLAY_BUTTON =
    "w-8! h-8! rounded-lg! bg-black/55! text-white! backdrop-blur-sm hover:bg-black/80! hover:text-white!";

export function createMangaCardElement(manga: Manga, eventHandlers: MangaCardEventHandlers = {}): MangaCard {
    const element = h("div", { className: "min-w-0", dataset: { id: manga.id } });

    const card = h("div", {
        "aria-label": manga.title,
        className: "manga-card group",
        dataset: { mangaId: manga.id },
        onclick: eventHandlers.onClick ? () => eventHandlers.onClick?.(manga) : undefined,
        onkeydown: (event: KeyboardEvent) => {
            if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
            event.preventDefault();
            eventHandlers.onClick?.(manga);
        },
        role: "button",
        tabindex: "0",
    });

    const placeholderIcon = iconSvg("BookOpen", { className: "animate-pulse", size: 26, strokeWidth: 1.5 });
    const placeholderText = h("span", { className: "text-[12px] font-medium" });
    const placeholder = h(
        "div",
        { className: "absolute inset-0 flex flex-col items-center justify-center gap-2 text-faint px-3 text-center" },
        placeholderIcon,
        placeholderText,
    );

    const cover = h("div", { className: "manga-cover" }, placeholder);

    const progressFill = h("div", { className: "h-full bg-accent-light" });
    const progressTrack = h(
        "div",
        { className: "absolute inset-x-0 bottom-0 h-1 bg-black/30 z-10", hidden: true },
        progressFill,
    );

    const blurb = manga.description
        ? h("p", { className: "cover-blurb z-10" }, h("span", { className: "line-clamp-3" }, manga.description))
        : null;

    const checkbox = h(
        "div",
        {
            className:
                "selection-checkbox absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-full bg-black/35 border-2 border-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 scale-90 transition-all duration-150",
        },
        iconSvg("Check", {
            className: "selection-check-icon opacity-0 scale-75 transition-all duration-150",
            size: 13,
            strokeWidth: 3,
        }),
    );

    const actions = h(
        "div",
        { className: "card-actions absolute top-2 right-2 z-20 flex gap-1" },
        createIconButton("Pencil", {
            className: `btn-icon ${OVERLAY_BUTTON}`,
            iconOptions: { size: 14 },
            onClick: eventHandlers.onEdit ? () => eventHandlers.onEdit?.(manga) : undefined,
            stopPropagation: true,
            tooltip: "Edit details",
        }),
        createIconButton("Trash2", {
            className: `btn-icon ${OVERLAY_BUTTON} hover:bg-danger!`,
            iconOptions: { size: 14 },
            onClick: eventHandlers.onDelete ? () => eventHandlers.onDelete?.(manga.id) : undefined,
            stopPropagation: true,
            tooltip: "Remove from library",
        }),
    );

    cover.append(...[blurb, progressTrack, checkbox, actions].filter((node) => node !== null));

    const meta = h("p", { className: "mt-1 text-[12.5px] text-muted truncate" });
    const caption = h(
        "div",
        { className: "pt-3 px-0.5" },
        h(
            "h3",
            { className: "text-[14px] font-semibold leading-snug tracking-tight line-clamp-2", title: manga.title },
            manga.title,
        ),
        meta,
    );

    card.append(cover, caption);
    element.append(card);

    function refreshProgress(): void {
        const total = manga.totalChapters;
        const saved = getSavedProgress(manga.id);
        const started = saved.currentChapter > 0 || saved.scrollAnchor.index > 0 || saved.scrollAnchor.pageFraction > 0;

        if (total > 0 && started) {
            const chapter = clamp(saved.currentChapter + 1, 1, total);
            setText(meta, `Chapter ${chapter} of ${total}`);
            progressFill.style.width = `${(chapter / total) * 100}%`;
            progressTrack.hidden = false;
        } else {
            setText(meta, total === 0 ? "No chapters" : `${total} ${total === 1 ? "chapter" : "chapters"}`);
            progressTrack.hidden = true;
        }
    }
    refreshProgress();

    // Load the cover after the card is in the DOM so slow covers don't block the grid.
    const showCoverError = (heading: string): void => {
        setText(placeholderText, heading);
        removeClass(placeholderIcon, "animate-pulse");
    };

    let coverImg: HTMLImageElement | null = null;

    function refreshCover(): void {
        void loadPageImage({ chapterIndex: 0, mangaId: manga.id }, 0)
            .then((data) => {
                if (data) {
                    if (coverImg?.src === data.url) return;
                    const img = new Image();
                    img.src = data.url;
                    addClass(img, "absolute inset-0 w-full h-full object-cover");
                    img.alt = `Cover for ${manga.title}`;
                    (coverImg ?? placeholder).replaceWith(img);
                    coverImg = img;
                } else if (!coverImg) {
                    showCoverError("Open to grant folder access");
                }
            })
            .catch((error: unknown) => {
                if (!coverImg) {
                    console.error(`Failed to load cover for ${manga.title}:`, error);
                    showCoverError("Couldn't read the cover");
                }
            });
    }

    refreshCover();

    return { element, refreshCover, refreshProgress };
}
