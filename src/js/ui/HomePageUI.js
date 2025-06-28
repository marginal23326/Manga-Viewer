import Sortable from "sortablejs";

import { createMangaCardElement } from "../components/MangaCard";
import { DOM, addClass, setText, setAttribute, getDataAttribute } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
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

    // --- Search Bar ---
    const searchContainer = document.createElement("div");
    addClass(searchContainer, "mb-8");
    const searchInput = document.createElement("input");
    setAttribute(searchInput, {
        type: "search",
        id: "manga-search-input",
        placeholder: "Search manga...",
    });
    addClass(searchInput, "w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100");
    DOM.mangaSearchInput = searchInput; // Store reference in DOM utility
    searchContainer.appendChild(searchInput);

    // --- Manga List Container ---
    const listContainer = document.createElement("div");
    addClass(listContainer, "flex flex-wrap -m-2");
    listContainer.id = "manga-list";
    DOM.mangaList = listContainer;

    // --- Append to Homepage Container ---
    container.appendChild(titleContainer);
    container.appendChild(addBtnContainer);
    container.appendChild(searchContainer);
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
    renderMangaList(getMangaList());

    if (DOM.mangaSearchInput) {
        const handleSearchInput = debounce((event) => {
            const query = event.target.value.toLowerCase();
            const allManga = getMangaList();
            const filteredManga = allManga.filter(manga =>
                manga.title.toLowerCase().includes(query)
            );
            renderMangaList(filteredManga);
        });
        DOM.mangaSearchInput.addEventListener("input", handleSearchInput);
    }
}
