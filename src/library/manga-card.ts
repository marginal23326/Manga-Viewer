import { addClass, h, removeClass, setText } from "@/core/dom-utils";
import { createIconButton, iconSvg } from "@/core/icons";
import { getResolvedPattern, loadImage, seedResolvedPattern } from "@/viewer/image-loader";
import { getSettings, updateSettings } from "@/state";
import type { Manga } from "@/types";

export interface MangaCardEventHandlers {
    onClick?: (manga: Manga) => void;
    onDelete?: (mangaId: string) => void;
    onEdit?: (manga: Manga) => void;
}

export interface MangaCardResult {
    cardWrapper: HTMLDivElement;
    setupScrollTitle: () => void;
}

export function createMangaCardElement(manga: Manga, eventHandlers: MangaCardEventHandlers = {}): MangaCardResult {
    const cardWrapper = h("div", { className: "w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 p-2.5 sm:p-3" });

    const card = h("div", {
        className: "manga-card flex flex-col cursor-pointer group relative",
        dataset: { mangaId: manga.id },
    });

    // --- Selection Checkbox ---
    const checkbox = h(
        "div",
        {
            className:
                "selection-checkbox absolute top-2.5 left-2.5 z-30 w-7 h-7 rounded-full bg-paper dark:bg-ink shadow-soft flex items-center justify-center opacity-0 scale-90 transition-all duration-150",
        },
        iconSvg("Check", {
            className:
                "selection-check-icon text-accent dark:text-accent-light opacity-0 scale-75 transition-all duration-150",
            size: 15,
            strokeWidth: 2.5,
        }),
    );
    card.append(checkbox);

    // --- Image Container ---
    const imgContainer = h("div", {
        className:
            "cover-image-container aspect-[3/4] w-full overflow-hidden relative bg-ink/[0.04] dark:bg-white/[0.04]",
    });

    const imgPlaceholder = h("div", {
        className: "absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink/30 dark:text-paper/25",
    });
    const placeholderText = h("span", { className: "text-xs font-medium animate-pulse" }, "Loading");
    const placeholderSubText = h("span", { className: "text-[11px] opacity-70" }, "");

    imgPlaceholder.append(placeholderText, placeholderSubText);
    imgContainer.append(imgPlaceholder);

    // --- Card Body ---
    const cardBody = h("div", { className: "p-4 flex-grow flex flex-col" });

    const titleSpan = h("span", {}, manga.title);
    const title = h(
        "h5",
        {
            className:
                "text-[15px] font-semibold tracking-tight mb-2 text-ink dark:text-paper group-hover:text-accent dark:group-hover:text-accent-light transition-colors cursor-help scroll-text",
            title: manga.title,
        },
        titleSpan,
    );

    // Stat row: a small hanko-style chapter badge + description
    const statsContainer = h("div", { className: "flex items-center gap-2 mb-2" });
    const chapterBadge = h(
        "span",
        { className: "hanko min-w-6 h-6 px-1.5 text-[10px]" },
        `${manga.userProvidedTotalChapters || "?"}`,
    );
    const chapterLabel = h(
        "span",
        { className: "eyebrow !text-ink/40 dark:!text-paper/35" },
        manga.userProvidedTotalChapters === 1 ? "chapter" : "chapters",
    );
    statsContainer.append(chapterBadge, chapterLabel);

    const description = h(
        "p",
        {
            className: "text-[12.5px] text-ink/45 dark:text-paper/40 line-clamp-2 mt-auto pt-2 border-t divider-line",
        },
        manga.description,
    );

    cardBody.append(title, statsContainer, description);

    // --- Action Buttons ---
    const buttonContainer = h("div", {
        className:
            "card-actions absolute top-2.5 right-2.5 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
    });

    const editButton = createIconButton("Pencil", {
        className: "btn-icon-overlay",
        iconOptions: { size: 14, strokeWidth: 2 },
        onClick: eventHandlers.onEdit ? () => eventHandlers.onEdit?.(manga) : undefined,
        stopPropagation: true,
        tooltip: "Edit manga",
    });
    const deleteButton = createIconButton("Trash2", {
        className:
            "btn-icon-overlay !text-accent dark:!text-accent-light hover:!bg-accent hover:!text-white dark:hover:!bg-accent-light dark:hover:!text-ink",
        iconOptions: { size: 14, strokeWidth: 2 },
        onClick: eventHandlers.onDelete ? () => eventHandlers.onDelete?.(manga.id) : undefined,
        stopPropagation: true,
        tooltip: "Delete manga",
    });

    buttonContainer.append(editButton, deleteButton);

    // --- Assemble Card ---
    card.append(buttonContainer, imgContainer, cardBody);

    if (eventHandlers.onClick) {
        card.addEventListener("click", () => eventHandlers.onClick?.(manga));
    }

    const handleMouseMove = (event: MouseEvent): void => {
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = (event.clientX - left) / width - 0.5;
        const y = (event.clientY - top) / height - 0.5;
        card.style.setProperty("--tilt-x", `${(-y * 8).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
    };

    const handleMouseLeave = (): void => {
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    cardWrapper.append(card);

    // Load the cover after the card is in the DOM so slow covers don't block the grid.
    const { imagePattern } = getSettings(manga.id);
    if (imagePattern) {
        seedResolvedPattern(manga.imagesFullPath, imagePattern);
    }
    const showCoverError = (heading: string, subtitle: string): void => {
        setText(placeholderText, heading);
        setText(placeholderSubText, subtitle);
        removeClass(placeholderText, "animate-pulse");
    };

    loadImage(manga.imagesFullPath, 1)
        .then((img) => {
            if (img) {
                addClass(
                    img,
                    "absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]",
                );
                img.alt = `Cover for ${manga.title}`;
                imgContainer.replaceChildren(img);

                const resolvedPattern = getResolvedPattern(manga.imagesFullPath);
                if (
                    resolvedPattern &&
                    (resolvedPattern.format !== imagePattern?.format ||
                        resolvedPattern.padLength !== imagePattern?.padLength)
                ) {
                    updateSettings(manga.id, { imagePattern: resolvedPattern });
                }
            } else {
                showCoverError("Not found", "Cover missing");
            }
        })
        .catch((error: unknown) => {
            console.error(`Failed to load cover for ${manga.title}:`, error);
            showCoverError("Couldn't load", "File read error");
        });

    // --- Setup Scrolling Title (only if text overflows) ---
    // Note: This must be called AFTER the card is appended to the DOM
    const setupScrollTitle = (): void => {
        // Compare scrollWidth of content against parent's constrained width
        if (titleSpan.scrollWidth > title.offsetWidth) {
            const scrollDistance = titleSpan.scrollWidth - title.offsetWidth;
            const scrollDurationSeconds = scrollDistance * 0.02;

            titleSpan.style.setProperty("--scroll-distance", `${scrollDistance}px`);
            titleSpan.style.setProperty("--scroll-duration", `${scrollDurationSeconds}s`);
            addClass(titleSpan, "scroll-overflow");
        } else {
            titleSpan.style.removeProperty("--scroll-distance");
            titleSpan.style.removeProperty("--scroll-duration");
            removeClass(titleSpan, "scroll-overflow");
        }
    };

    return { cardWrapper, setupScrollTitle };
}
