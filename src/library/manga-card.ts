import { addClass, h, removeClass, setText } from "@/core/dom-utils";
import { createIconButton, iconSvg } from "@/core/icons";
import { getResolvedPattern, loadImage, seedResolvedPattern } from "@/viewer/image-loader";
import { getSettings, updateSettings } from "@/state/manga-settings";
import type { Manga } from "@/types";

export interface MangaCardEventHandlers {
    onClick?: (manga: Manga, cardElement: HTMLDivElement) => void;
    onDelete?: (mangaId: string) => void;
    onEdit?: (manga: Manga) => void;
}

export interface MangaCardResult {
    cardWrapper: HTMLDivElement;
    setupScrollTitle: () => void;
}

export function createMangaCardElement(manga: Manga, eventHandlers: MangaCardEventHandlers = {}): MangaCardResult {
    const cardWrapper = h("div", { className: "w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 p-3 sm:p-4" });

    const card = h("div", {
        className: "manga-card flex flex-col cursor-pointer group relative",
        dataset: { mangaId: manga.id },
    });

    // --- Selection Checkbox ---
    const checkbox = h(
        "div",
        {
            className:
                "selection-checkbox absolute top-2 left-2 z-30 w-8 h-8 bg-paper dark:bg-ink brutal-border flex items-center justify-center opacity-0 scale-90 transition-all duration-150 brutal-shadow-sm-accent",
        },
        iconSvg("Check", {
            className: "selection-check-icon text-accent opacity-0 scale-75 transition-all duration-150",
            size: 20,
            strokeWidth: 4,
        }),
    );
    card.append(checkbox);

    // --- Image Container ---
    const imgContainer = h("div", {
        className:
            "cover-image-container aspect-[3/4] w-full overflow-hidden relative bg-black dark:bg-white border-b-2 border-black dark:border-white",
    });

    const imgPlaceholder = h("div", {
        className:
            "absolute inset-0 flex flex-col items-center justify-center text-white dark:text-black text-label text-sm bg-black dark:bg-white",
    });
    const placeholderText = h("span", { className: "bg-accent text-white px-2 py-1 mb-2 animate-pulse" }, "NO DATA");
    const placeholderSubText = h("span", { className: "text-xs opacity-70" }, "Loading...");

    imgPlaceholder.append(placeholderText, placeholderSubText);
    imgContainer.append(imgPlaceholder);

    // --- Card Body (Stark Typography) ---
    const cardBody = h("div", { className: "p-4 flex-grow flex flex-col bg-paper dark:bg-ink" });

    const titleSpan = h("span", {}, manga.title);
    const title = h(
        "h5",
        {
            className:
                "text-lg font-space font-bold uppercase tracking-tight mb-1 text-black dark:text-white group-hover:text-accent transition-colors cursor-help scroll-text",
            title: manga.title,
        },
        titleSpan,
    );

    // A brutalist stat block instead of plain text
    const statsContainer = h("div", { className: "flex items-center space-x-2 mt-2 mb-3" });
    const chapterBadge = h(
        "span",
        {
            className: "inline-block px-2 py-1 text-xs font-bold brutal-border bg-accent text-white",
        },
        `CH ${manga.userProvidedTotalChapters || "?"}`,
    );
    statsContainer.append(chapterBadge);

    const description = h(
        "p",
        {
            className:
                "text-xs font-space text-gray-700 dark:text-gray-400 line-clamp-2 mt-auto border-t-2 border-black/10 dark:border-white/10 pt-2",
        },
        manga.description,
    );

    cardBody.append(title, statsContainer, description);

    // --- Action Buttons ---
    const buttonContainer = h("div", {
        className:
            "card-actions absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
    });

    const editButton = createIconButton("Pencil", {
        className:
            "btn-icon flex items-center justify-center transition-colors w-8 h-8 !p-1 bg-paper dark:bg-ink text-black dark:text-white hover:bg-accent hover:text-white brutal-border brutal-shadow-sm",
        iconOptions: { size: 16, strokeWidth: 2.5 },
        onClick: eventHandlers.onEdit ? () => eventHandlers.onEdit?.(manga) : undefined,
        stopPropagation: true,
    });
    const deleteButton = createIconButton("Trash2", {
        className:
            "btn-icon flex items-center justify-center transition-colors w-8 h-8 !p-1 bg-black text-white dark:bg-white dark:text-black hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-white brutal-border brutal-shadow-sm-accent",
        iconOptions: { size: 16, strokeWidth: 2.5 },
        onClick: eventHandlers.onDelete ? () => eventHandlers.onDelete?.(manga.id) : undefined,
        stopPropagation: true,
    });

    buttonContainer.append(editButton, deleteButton);

    // --- Assemble Card ---
    card.append(buttonContainer, imgContainer, cardBody);

    if (eventHandlers.onClick) {
        card.addEventListener("click", () => eventHandlers.onClick?.(manga, card));
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
                    "absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 grayscale group-hover:grayscale-0",
                );
                img.alt = `Cover for ${manga.title}`;
                imgContainer.innerHTML = "";
                imgContainer.append(img);

                const resolvedPattern = getResolvedPattern(manga.imagesFullPath);
                if (
                    resolvedPattern &&
                    (resolvedPattern.format !== imagePattern?.format ||
                        resolvedPattern.padLength !== imagePattern?.padLength)
                ) {
                    updateSettings(manga.id, { imagePattern: resolvedPattern });
                }
            } else {
                showCoverError("ERR: 404", "Cover missing");
            }
        })
        .catch((error: unknown) => {
            console.error(`Failed to load cover for ${manga.title}:`, error);
            showCoverError("ERR: LOAD", "File read error");
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
