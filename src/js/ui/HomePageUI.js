import Sortable from "sortablejs";

import { createSelect } from "../components/CustomSelect";
import { createMangaCardElement } from "../components/MangaCard";
import { DOM, addClass, setText, setAttribute, getDataAttribute } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { State } from "../core/State";
import { debounce } from "../core/Utils";
import { openMangaModal, deleteManga, loadMangaForViewing, saveMangaOrder, getMangaList } from "../features/MangaManager";


let sortableInstance = null;

function renderHomepageStructure() {
    const container = DOM.homepageContainer;
    if (!container) return;
    container.innerHTML = ""; // Clear container

    // --- Title ---
    const titleContainer = document.createElement("div");
    addClass(titleContainer, "text-center mb-8");
    const title = document.createElement("h1");
    addClass(title, "text-4xl sm:text-5xl md:text-6xl font-cursive font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 inline-block py-2",);
    setText(title, "Manga Viewer");
    titleContainer.appendChild(title);

    // --- Add Button ---
    const addBtnContainer = document.createElement("div");
    addClass(addBtnContainer, "text-center mb-8");
    const addBtn = document.createElement("button");
    addClass(addBtn, "btn btn-primary");
    addBtn.id = "add-manga-btn";
    const addIcon = document.createElement("i");
    setAttribute(addIcon, { "data-lucide": "plus-circle", "class": "inline-block mr-2", "width": "20", "height": "20" });
    addBtn.appendChild(addIcon);
    addBtn.appendChild(document.createTextNode("Add Manga"));
    addBtn.addEventListener("click", () => openMangaModal());
    addBtnContainer.appendChild(addBtn);

    // --- Search and Sort Container ---
    const searchAndSortContainer = document.createElement("div");
    addClass(searchAndSortContainer, "mb-8 flex flex-col sm:flex-row sm:space-x-4");

    // --- Search Bar ---
    const searchInput = document.createElement("input");
    setAttribute(searchInput, {
        type: "search",
        id: "manga-search-input",
        placeholder: "Search manga...",
    });
    addClass(searchInput, "w-full sm:w-2/3 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-4 sm:mb-0");
    DOM.mangaSearchInput = searchInput; // Store reference in DOM utility
    searchAndSortContainer.appendChild(searchInput);

    // --- Sort Options ---
    const sortOptions = [
        { value: "custom", text: "Custom Order" },
        { value: "title-asc", text: "Title (A-Z)" },
        { value: "title-desc", text: "Title (Z-A)" },
        { value: "chapters-asc", text: "Chapters (Low to High)" },
        { value: "chapters-desc", text: "Chapters (High to Low)" },
    ];

    const customSortSelect = createSelect({
        id: "manga-sort-select",
        items: sortOptions,
        value: State.mangaSortOrder,
        onChange: (newValue) => {
            State.update("mangaSortOrder", newValue);
            applyFiltersAndSorting();
        },
        width: "w-52",
        buttonClass: "px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
    });
    DOM.mangaSortSelect = customSortSelect; // Store the customSelect object for its methods
    searchAndSortContainer.appendChild(customSortSelect.element);

    // --- Manga List Container ---
    const listContainer = document.createElement("div");
    addClass(listContainer, "flex flex-wrap -m-2");
    listContainer.id = "manga-list";
    DOM.mangaList = listContainer;

    // --- Append to Homepage Container ---
    container.appendChild(titleContainer);
    container.appendChild(addBtnContainer);
    container.appendChild(searchAndSortContainer);
    container.appendChild(listContainer);
}

export async function renderMangaList(mangaArray) {
    if (!DOM.mangaList) return;
    DOM.mangaList.innerHTML = ""; // Clear only list

    if (!mangaArray || mangaArray.length === 0) {
        const emptyMessage = document.createElement("p");
        addClass(emptyMessage, "text-center text-gray-500 dark:text-gray-400 w-full py-10");
        setText(emptyMessage, 'No manga added yet. Click "Add Manga" to get started!');
        DOM.mangaList.appendChild(emptyMessage);
        return;
    }

    const cardPromises = mangaArray.map((manga) =>
        createMangaCardElement(manga, {
            onClick: loadMangaForViewing,
            onEdit: openMangaModal,
            onDelete: deleteManga,
        }),
    );
    const cardElements = await Promise.all(cardPromises);
    const fragment = document.createDocumentFragment();
    cardElements.forEach((cardElement) => {
        if (cardElement) {
            fragment.appendChild(cardElement);
        }
    });
    DOM.mangaList.appendChild(fragment);

    renderIcons();
    initSortable();
}

// Initialize SortableJS for drag-and-drop
function initSortable() {
    if (!DOM.mangaList) return;
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(DOM.mangaList, {
        animation: 150,
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        handle: ".manga-card",
        filter: ".edit-btn, .delete-btn",
        preventOnFilter: true,
        onEnd: (evt) => {
            const newOrderIds = Array.from(evt.to.children).map((cardWrapper) => {
                const mangaCardElement = cardWrapper.querySelector(".manga-card");
                return getDataAttribute(mangaCardElement, "mangaId");
            });
            saveMangaOrder(newOrderIds);
        },
    });
}

export function initHomePageUI() {
    renderHomepageStructure();
    applyFiltersAndSorting();

    if (DOM.mangaSearchInput) {
        const handleSearchInput = debounce(() => {
            applyFiltersAndSorting();
        });
        DOM.mangaSearchInput.addEventListener("input", handleSearchInput);
    }
}

function applyFiltersAndSorting() {
    let mangaToRender = getMangaList();

    // Apply Search Filter
    if (DOM.mangaSearchInput && DOM.mangaSearchInput.value) {
        const query = DOM.mangaSearchInput.value.toLowerCase();
        mangaToRender = mangaToRender.filter(manga =>
            manga.title.toLowerCase().includes(query)
        );
    }

    // Apply Sorting
    const sortOption = State.mangaSortOrder;
    if (sortOption === "custom") {
        initSortable();
    } else {
        if (sortableInstance) {
            sortableInstance.destroy();
            sortableInstance = null;
        }
        mangaToRender.sort((a, b) => {
            switch (sortOption) {
                case "title-asc":
                    return a.title.localeCompare(b.title);
                case "title-desc":
                    return b.title.localeCompare(a.title);
                case "chapters-asc":
                    return (a.totalChapters || 0) - (b.totalChapters || 0);
                case "chapters-desc":
                    return (b.totalChapters || 0) - (a.totalChapters || 0);
                default:
                    return 0;
            }
        });
    }

    renderMangaList(mangaToRender);
}
