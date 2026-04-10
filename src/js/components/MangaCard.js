import { setText, addClass, setDataAttribute, setAttribute } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";

function createActionButton(iconName, additionalClassesString = "", eventHandler) {
    const button = document.createElement("button");
    // Stripped rounded corners, added sharp brutalist styling
    addClass(button, `btn-icon absolute z-20 ${additionalClassesString.trim()}`);

    const icon = document.createElement("i");
    setAttribute(icon, { "data-lucide": iconName, width: "16", height: "16", "stroke-width": "2.5" });
    button.appendChild(icon);

    if (eventHandler) {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            eventHandler();
        });
    }
    return button;
}

// Function to create a single manga card element
export async function createMangaCardElement(manga, eventHandlers = {}) {
    const cardWrapper = document.createElement("div");
    // Adjusted padding for the harsher drop shadows so they don't clip
    addClass(cardWrapper, "w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 p-3 sm:p-4");

    const card = document.createElement("div");
    // Removed the generic 3D radial gradient transform and rounded borders.
    // Applying the class from styles.css which handles the brutalist shadow.
    addClass(card, "manga-card flex flex-col cursor-pointer group");
    setDataAttribute(card, "mangaId", manga.id);

    // --- Selection Checkbox (Redesigned as a stark square) ---
    const checkbox = document.createElement("div");
    addClass(
        checkbox,
        "absolute top-2 left-2 z-30 w-8 h-8 bg-[#f4f4f0] dark:bg-[#0a0a0a] border-2 border-black dark:border-white flex items-center justify-center opacity-0 transition-opacity duration-150 pointer-events-none group-hover:opacity-100 shadow-[2px_2px_0_0_#FF3366]",
    );
    const checkboxIcon = document.createElement("i");
    setAttribute(checkboxIcon, { "data-lucide": "check", width: "20", height: "20", "stroke-width": "4" });
    addClass(checkboxIcon, "text-[#FF3366]");
    checkbox.appendChild(checkboxIcon);
    card.appendChild(checkbox);

    // --- Image Container ---
    const imgContainer = document.createElement("div");
    // Added 'cover-image-container' for the CSS screen-tone overlay
    addClass(
        imgContainer,
        "cover-image-container aspect-[3/4] w-full overflow-hidden relative bg-black dark:bg-white border-b-2 border-black dark:border-white",
    );

    const imgPlaceholder = document.createElement("div");
    addClass(
        imgPlaceholder,
        "absolute inset-0 flex flex-col items-center justify-center text-white dark:text-black font-space font-bold uppercase tracking-widest text-sm bg-black dark:bg-white",
    );

    // Animate the placeholder to look like a blinking terminal cursor or tape
    const placeholderText = document.createElement("span");
    setText(placeholderText, "NO DATA");
    addClass(placeholderText, "bg-[#FF3366] text-white px-2 py-1 mb-2 animate-pulse");

    const placeholderSubText = document.createElement("span");
    setText(placeholderSubText, "Loading...");
    addClass(placeholderSubText, "text-xs opacity-70");

    imgPlaceholder.appendChild(placeholderText);
    imgPlaceholder.appendChild(placeholderSubText);
    imgContainer.appendChild(imgPlaceholder);

    // --- Card Body (Stark Typography) ---
    const cardBody = document.createElement("div");
    addClass(cardBody, "p-4 flex-grow flex flex-col bg-[#f4f4f0] dark:bg-[#0a0a0a]");

    const title = document.createElement("h5");
    addClass(
        title,
        "text-lg font-space font-bold uppercase tracking-tight mb-1 text-black dark:text-white group-hover:text-[#FF3366] transition-colors cursor-help scroll-text",
    );
    const titleSpan = document.createElement("span");
    titleSpan.textContent = manga.title;
    title.appendChild(titleSpan);
    setAttribute(title, { title: manga.title });

    // A brutalist stat block instead of plain text
    const statsContainer = document.createElement("div");
    addClass(statsContainer, "flex items-center space-x-2 mt-2 mb-3");

    const chapterBadge = document.createElement("span");
    addClass(
        chapterBadge,
        "inline-block px-2 py-1 text-xs font-bold border-2 border-black dark:border-white bg-[#FF3366] text-white",
    );
    setText(chapterBadge, `CH ${manga.userProvidedTotalChapters || "?"}`);

    statsContainer.appendChild(chapterBadge);

    const description = document.createElement("p");
    addClass(
        description,
        "text-xs font-space text-gray-700 dark:text-gray-400 line-clamp-2 mt-auto border-t-2 border-black/10 dark:border-white/10 pt-2",
    );
    setText(description, manga.description);

    cardBody.appendChild(title);
    cardBody.appendChild(statsContainer);
    cardBody.appendChild(description);

    // --- Action Buttons ---
    const buttonContainer = document.createElement("div");
    addClass(buttonContainer, "absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20");

    // Position buttons using absolute positioning to stick them to the edges of the card
    const editButton = createActionButton(
        "pencil",
        "top-2 right-12 w-8 h-8 !p-1 hover:bg-[#FF3366] hover:text-white border-black dark:border-white shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#fff]",
        eventHandlers.onEdit ? () => eventHandlers.onEdit(manga) : null,
    );
    const deleteButton = createActionButton(
        "trash-2",
        "top-2 right-2 w-8 h-8 !p-1 bg-black text-white dark:bg-white dark:text-black hover:bg-[#FF3366] hover:text-white dark:hover:bg-[#FF3366] dark:hover:text-white border-black dark:border-white shadow-[2px_2px_0_0_#FF3366]",
        eventHandlers.onDelete ? () => eventHandlers.onDelete(manga.id) : null,
    );

    card.appendChild(editButton);
    card.appendChild(deleteButton);

    // --- Assemble Card ---
    card.appendChild(imgContainer);
    card.appendChild(cardBody);

    if (eventHandlers.onClick) {
        card.addEventListener("click", () => eventHandlers.onClick(manga, card));
    }

    cardWrapper.appendChild(card);

    // --- Load Cover Image Asynchronously ---
    try {
        // Use index 1 for the cover image.
        const img = await loadImage(manga.imagesFullPath, 1);
        if (img) {
            addClass(
                img,
                "absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 filter grayscale group-hover:grayscale-0",
            );
            img.alt = `Cover for ${manga.title}`;
            imgContainer.innerHTML = ""; // Clear placeholder
            imgContainer.appendChild(img);
        } else {
            setText(placeholderText, "ERR: 404");
            setText(placeholderSubText, "Cover missing");
            removeClass(placeholderText, "animate-pulse");
        }
    } catch (error) {
        console.error(`Failed to load cover for ${manga.title}:`, error);
        setText(placeholderText, "ERR: LOAD");
        setText(placeholderSubText, "File read error");
        removeClass(placeholderText, "animate-pulse");
    }

    // --- Setup Scrolling Title (only if text overflows) ---
    // Note: This must be called AFTER the card is appended to the DOM
    const setupScrollTitle = () => {
        // Compare scrollWidth of content against parent's constrained width
        if (titleSpan.scrollWidth > title.offsetWidth) {
            const scrollDistance = titleSpan.scrollWidth - title.offsetWidth;
            const duration = scrollDistance * 0.02; // Speed: pixels per second
            const keyframes = `
                @keyframes scroll-title-${manga.id} {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-${scrollDistance}px); }
                }
                .manga-card:hover .scroll-container-${manga.id} {
                    animation: scroll-title-${manga.id} ${duration}s linear forwards;
                }
            `;
            
            // Inject dynamic keyframes and hover trigger
            const style = document.createElement("style");
            style.textContent = keyframes;
            document.head.appendChild(style);
            
            // Wrap span in container for hover targeting
            titleSpan.classList.add(`scroll-container-${manga.id}`);
        }
    };

    return { cardWrapper, setupScrollTitle };
}

// helper for error state since removeClass isn't imported at top
function removeClass(element, className) {
    if (element && className) {
        element.classList.remove(...className.split(" ").filter(Boolean));
    }
}
