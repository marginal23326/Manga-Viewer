import { CurrentProgress, getImageUrl, hasProgress } from "@/state";
import { type IconName, createIconButton, iconSvg } from "@/core/icons";
import { h, setText } from "@/core/dom-utils";
import type { Manga } from "@/types";
import { clamp } from "@/core/utils";

export interface MangaCard {
    element: HTMLDivElement;
    refreshCover: () => void;
    refreshProgress: () => void;
}

function createCardAction(action: "delete" | "edit", icon: IconName, tooltip: string): HTMLButtonElement {
    const button = createIconButton(icon, { className: "btn-icon-overlay", iconOptions: { size: 14 }, tooltip });
    button.dataset.action = action;
    return button;
}

export function createMangaCardElement(manga: Manga): MangaCard {
    const element = h("div", { className: "min-w-0", dataset: { id: manga.id } });

    const card = h("div", { className: "manga-card group", tabindex: "0" });

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
                "selection-checkbox absolute top-2.5 left-2.5 z-20 w-6 h-6 rounded-full bg-black/35 border-2 border-white/90 backdrop-blur-sm flex items-center justify-center",
        },
        iconSvg("Check", {
            className: "selection-check-icon",
            size: 13,
            strokeWidth: 3,
        }),
    );

    const actions = h(
        "div",
        { className: "card-actions absolute top-2 right-2 z-20 flex gap-1" },
        createCardAction("edit", "Pencil", "Edit details"),
        createCardAction("delete", "Trash2", "Remove from library"),
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
        const saved = CurrentProgress.resolve(manga.id);
        const started = hasProgress(saved);

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
        placeholderIcon.classList.remove("animate-pulse");
    };

    let coverImg: HTMLImageElement | null = null;

    function refreshCover(): void {
        void getImageUrl({ chapterIndex: 0, mangaId: manga.id }, 0).then((url) => {
            if (url) {
                if (coverImg?.src === url) return;
                const img = h("img", {
                    alt: `Cover for ${manga.title}`,
                    className: "absolute inset-0 w-full h-full object-cover",
                    src: url,
                });
                (coverImg ?? placeholder).replaceWith(img);
                coverImg = img;
            } else if (!coverImg) {
                showCoverError("Open to grant folder access");
            }
        });
    }

    refreshCover();

    return { element, refreshCover, refreshProgress };
}
