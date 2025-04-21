import { setText, addClass, setDataAttribute, setAttribute } from "../core/DOMUtils";
import { loadImage } from "../core/ImageLoader";

function createActionButton(iconName, additionalClassesString = "", eventHandler) {
    const button = document.createElement("button");
    addClass(button, `${("btn-icon bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm " + additionalClassesString).trim()}`);

    const icon = document.createElement("i");
    setAttribute(icon, { "data-lucide": iconName, "width": "16", "height": "16", "stroke-width": "2" });
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
    // Responsive grid column classes
    addClass(cardWrapper, "w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 p-2");

    const card = document.createElement("div");
    addClass(card, "manga-card bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col cursor-pointer transition-all duration-300 transform hover:scale-[1.03] hover:shadow-xl relative group border border-transparent hover:border-blue-500/50");
    setDataAttribute(card, "mangaId", manga.id);

    // --- Image Container ---
    const imgContainer = document.createElement("div");
    addClass(imgContainer, "aspect-[3/4] w-full overflow-hidden relative bg-gray-200 dark:bg-gray-700");
    const imgPlaceholder = document.createElement("div");
    addClass(imgPlaceholder, "absolute inset-0 flex items-center justify-center text-gray-500 text-sm");
    setText(imgPlaceholder, "Loading Cover...");
    imgContainer.appendChild(imgPlaceholder);

    // --- Card Body ---
    const cardBody = document.createElement("div");
    addClass(cardBody, "p-3 flex-grow flex flex-col justify-between");
    const title = document.createElement("h5");
    addClass(title, "text-base font-bold truncate mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400");
    setText(title, manga.title);
    const chapterInfo = document.createElement("p");
    addClass(chapterInfo, "text-xs text-gray-500 dark:text-gray-400 mb-2");
    setText(chapterInfo, `Chapters: ${manga.userProvidedTotalChapters || "N/A"}`);
    const description = document.createElement("p");
    addClass(description, "text-sm text-gray-600 dark:text-gray-300 line-clamp-3");
    setText(description, manga.description || "");
    cardBody.appendChild(title);
    cardBody.appendChild(chapterInfo);
    cardBody.appendChild(description);

    // --- Action Buttons ---
    const buttonContainer = document.createElement("div");
    addClass(buttonContainer, "absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200");

    const editButton = createActionButton(
        "pencil", "edit-btn", eventHandlers.onEdit ? () => eventHandlers.onEdit(manga) : null
    );
    const deleteButton = createActionButton(
        "trash-2", "delete-btn text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50",
        eventHandlers.onDelete ? () => eventHandlers.onDelete(manga.id) : null
    );

    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);

    // --- Assemble Card ---
    card.appendChild(imgContainer);
    card.appendChild(cardBody);
    card.appendChild(buttonContainer);

    if (eventHandlers.onClick) {
        card.addEventListener("click", () => eventHandlers.onClick(manga));
    }

    cardWrapper.appendChild(card);

    // --- Load Cover Image Asynchronously ---
    try {
        // Use index 1 for the cover image.
        const img = await loadImage(manga.imagesFullPath, 1);
        if (img) {
            addClass(img, "absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110");
            img.alt = `Cover for ${manga.title}`;
            imgContainer.innerHTML = ""; // Clear placeholder
            imgContainer.appendChild(img);
        } else {
            setText(imgPlaceholder, "Cover N/A");
        }
    } catch (error) {
        console.error(`Failed to load cover for ${manga.title}:`, error);
        setText(imgPlaceholder, "Load Error");
    }

    return cardWrapper;
}
