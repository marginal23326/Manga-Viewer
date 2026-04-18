import { setText, addClass, removeClass, h } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";

function createActionButton(iconName, additionalClassesString = "", eventHandler) {
    const button = h(
        "button",
        { className: `btn-icon flex items-center justify-center transition-colors ${additionalClassesString.trim()}` },
        h("i", { "data-lucide": iconName, width: "16", height: "16", "stroke-width": "2.5" }),
    );

    if (eventHandler) {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            eventHandler();
        });
    }
    return button;
}

// Function to create a single manga card element
export function createMangaCardElement(manga, eventHandlers = {}) {
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
        h("i", {
            "data-lucide": "check",
            width: "20",
            height: "20",
            "stroke-width": "4",
            className: "selection-check-icon text-[#FF3366] opacity-0 scale-75 transition-all duration-150",
        }),
    );
    card.appendChild(checkbox);

    // --- Image Container ---
    const imgContainer = h("div", {
        className:
            "cover-image-container aspect-[3/4] w-full overflow-hidden relative bg-black dark:bg-white border-b-2 border-black dark:border-white",
    });

    const imgPlaceholder = h("div", {
        className:
            "absolute inset-0 flex flex-col items-center justify-center text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm bg-black dark:bg-white",
    });
    const placeholderText = h("span", { className: "bg-[#FF3366] text-white px-2 py-1 mb-2 animate-pulse" }, "NO DATA");
    const placeholderSubText = h("span", { className: "text-xs opacity-70" }, "Loading...");

    imgPlaceholder.appendChild(placeholderText);
    imgPlaceholder.appendChild(placeholderSubText);
    imgContainer.appendChild(imgPlaceholder);

    // --- Card Body (Stark Typography) ---
    const cardBody = h("div", { className: "p-4 flex-grow flex flex-col bg-paper dark:bg-ink" });

    const titleSpan = h("span", {}, manga.title);
    const title = h(
        "h5",
        {
            className:
                "text-lg font-space font-bold uppercase tracking-tight mb-1 text-black dark:text-white group-hover:text-[#FF3366] transition-colors cursor-help scroll-text",
            title: manga.title,
        },
        titleSpan,
    );

    // A brutalist stat block instead of plain text
    const statsContainer = h("div", { className: "flex items-center space-x-2 mt-2 mb-3" });
    const chapterBadge = h(
        "span",
        {
            className: "inline-block px-2 py-1 text-xs font-bold brutal-border bg-[#FF3366] text-white",
        },
        `CH ${manga.userProvidedTotalChapters || "?"}`,
    );
    statsContainer.appendChild(chapterBadge);

    const description = h(
        "p",
        {
            className:
                "text-xs font-space text-gray-700 dark:text-gray-400 line-clamp-2 mt-auto border-t-2 border-black/10 dark:border-white/10 pt-2",
        },
        manga.description,
    );

    cardBody.appendChild(title);
    cardBody.appendChild(statsContainer);
    cardBody.appendChild(description);

    // --- Action Buttons ---
    const buttonContainer = h("div", {
        className:
            "card-actions absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
    });

    const editButton = createActionButton(
        "pencil",
        "w-8 h-8 !p-1 bg-paper dark:bg-ink text-black dark:text-white hover:bg-[#FF3366] hover:text-white brutal-border brutal-shadow-sm",
        eventHandlers.onEdit ? () => eventHandlers.onEdit(manga) : null,
    );
    const deleteButton = createActionButton(
        "trash-2",
        "w-8 h-8 !p-1 bg-black text-white dark:bg-white dark:text-black hover:bg-[#FF3366] hover:text-white dark:hover:bg-[#FF3366] dark:hover:text-white brutal-border brutal-shadow-sm-accent",
        eventHandlers.onDelete ? () => eventHandlers.onDelete(manga.id) : null,
    );

    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);

    // --- Assemble Card ---
    card.appendChild(buttonContainer);
    card.appendChild(imgContainer);
    card.appendChild(cardBody);

    if (eventHandlers.onClick) {
        card.addEventListener("click", () => eventHandlers.onClick(manga, card));
    }

    cardWrapper.appendChild(card);

    // Load the cover after the card is already in the DOM so one slow image
    // does not block rendering the rest of the grid.
    loadImage(manga.imagesFullPath, 1)
        .then((img) => {
            if (img) {
                addClass(
                    img,
                    "absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 filter grayscale group-hover:grayscale-0",
                );
                img.alt = `Cover for ${manga.title}`;
                imgContainer.innerHTML = "";
                imgContainer.appendChild(img);
            } else {
                setText(placeholderText, "ERR: 404");
                setText(placeholderSubText, "Cover missing");
                removeClass(placeholderText, "animate-pulse");
            }
        })
        .catch((error) => {
            console.error(`Failed to load cover for ${manga.title}:`, error);
            setText(placeholderText, "ERR: LOAD");
            setText(placeholderSubText, "File read error");
            removeClass(placeholderText, "animate-pulse");
        });

    // --- Setup Scrolling Title (only if text overflows) ---
    // Note: This must be called AFTER the card is appended to the DOM
    const setupScrollTitle = () => {
        // Compare scrollWidth of content against parent's constrained width
        if (titleSpan.scrollWidth > title.offsetWidth) {
            const scrollDistance = titleSpan.scrollWidth - title.offsetWidth;
            const duration = scrollDistance * 0.02; // Speed: pixels per second

            titleSpan.style.setProperty("--scroll-distance", `${scrollDistance}px`);
            titleSpan.style.setProperty("--scroll-duration", `${duration}s`);
            addClass(titleSpan, "scroll-overflow");
        } else {
            titleSpan.style.removeProperty("--scroll-distance");
            titleSpan.style.removeProperty("--scroll-duration");
            removeClass(titleSpan, "scroll-overflow");
        }
    };

    return { cardWrapper, setupScrollTitle };
}
