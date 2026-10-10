import { type IconName, createIconButton, iconSvg } from "@/core/icons";
import { clamp, pluralize } from "@/core/utils";
import { getImageUrl, hasProgress, readProgress } from "@/state";
import type { Manga } from "@/types";
import { h } from "@/core/dom-utils";

export interface MangaCard {
    element: HTMLDivElement;
    manga: Manga;
    refresh: () => void;
}

function createCardAction(action: "delete" | "edit", icon: IconName, tooltip: string): HTMLButtonElement {
    const button = createIconButton(icon, { className: "btn-icon-overlay", iconOptions: { size: 14 }, tooltip });
    button.dataset.action = action;
    return button;
}

export function createMangaCardElement(manga: Manga): MangaCard {
    const placeholderIcon = iconSvg("BookOpen", { className: "animate-pulse", size: 26, strokeWidth: 1.5 });
    const placeholderText = h("span", { className: "text-[12px] font-medium" });
    const placeholder = h(
        "div",
        { className: "absolute inset-0 flex flex-col items-center justify-center gap-2 text-faint px-3 text-center" },
        placeholderIcon,
        placeholderText,
    );

    const progressFill = h("div", { className: "h-full bg-accent-light" });
    const progressTrack = h(
        "div",
        { className: "absolute inset-x-0 bottom-0 h-1 bg-black/30 z-10", hidden: true },
        progressFill,
    );

    const blurb = manga.description
        ? h(
              "p",
              { className: "cover-blurb z-10" },
              h("span", { className: "line-clamp-3 break-words" }, manga.description),
          )
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

    const cover = h("div", { className: "manga-cover" }, placeholder, blurb, progressTrack, checkbox, actions);

    const meta = h("p", { className: "mt-1 text-[12.5px] text-muted truncate" });
    const caption = h(
        "div",
        { className: "pt-3 px-0.5" },
        h(
            "h3",
            {
                className: "text-[14px] font-semibold leading-snug tracking-tight line-clamp-2 break-words",
                title: manga.title,
            },
            manga.title,
        ),
        meta,
    );

    const element = h("div", { className: "manga-card", dataset: { id: manga.id }, tabindex: "0" }, cover, caption);

    let coverImg: HTMLImageElement | null = null;

    function refresh(): void {
        const total = manga.totalChapters;
        const saved = readProgress(manga.id);

        if (total > 0 && hasProgress(saved)) {
            const chapter = clamp(saved.currentChapter + 1, 1, total);
            meta.textContent = `Chapter ${chapter} of ${total}`;
            progressFill.style.width = `${(chapter / total) * 100}%`;
            progressTrack.hidden = false;
        } else {
            meta.textContent = total === 0 ? "No chapters" : pluralize(total, "chapter");
            progressTrack.hidden = true;
        }

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
                placeholderText.textContent = "Open to grant folder access";
                placeholderIcon.classList.remove("animate-pulse");
            }
        });
    }
    refresh();

    return { element, manga, refresh };
}
