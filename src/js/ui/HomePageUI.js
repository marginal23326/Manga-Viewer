import Sortable from "sortablejs";

import { createSelect } from "../components/CustomSelect";
import { createMangaCardElement } from "../components/MangaCard";
import {
    DOM,
    addClass,
    setText,
    setAttribute,
    getDataAttribute,
    toggleClass,
    setHtml,
    removeClass,
} from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { State } from "../core/State";
import { debounce } from "../core/Utils";
import {
    openMangaModal,
    loadMangaForViewing,
    saveMangaOrder,
    getMangaList,
    confirmAndDelete,
} from "../features/MangaManager";

let sortableInstance = null;

function updateSelectionUI() {
    const { selectionActionsContainer, addMangaBtn, mangaSelectBtn } = DOM;
    if (!selectionActionsContainer || !addMangaBtn || !mangaSelectBtn) return;

    const count = State.selectedMangaIds.length;
    const isEnabled = State.isSelectModeEnabled;

    toggleClass(selectionActionsContainer, "hidden", !isEnabled);
    toggleClass(selectionActionsContainer, "flex", isEnabled); // Ensure it displays as flex when shown
    toggleClass(addMangaBtn, "hidden", isEnabled);

    // Update Select button styling to brutalist active state
    if (isEnabled) {
        removeClass(mangaSelectBtn, "btn-secondary");
        addClass(mangaSelectBtn, "btn-primary"); // Becomes solid and attention-grabbing

        const countText = selectionActionsContainer.querySelector("#selection-count");
        const deleteBtn = selectionActionsContainer.querySelector("#delete-selected-btn");

        setText(countText, `${count} VOLUMES SELECTED`);
        if (deleteBtn) {
            deleteBtn.disabled = count === 0;
            toggleClass(deleteBtn, "opacity-50 cursor-not-allowed saturate-0", count === 0);
        }
        setHtml(
            mangaSelectBtn,
            `<i data-lucide="x-square" class="inline-block mr-2" width="20" height="20"></i>CANCEL`,
        );
    } else {
        removeClass(mangaSelectBtn, "btn-primary");
        addClass(mangaSelectBtn, "btn-secondary");
        setHtml(
            mangaSelectBtn,
            `<i data-lucide="check-square" class="inline-block mr-2" width="20" height="20"></i>SELECT`,
        );
    }
    renderIcons();
}

function toggleSelectMode() {
    State.update("isSelectModeEnabled", !State.isSelectModeEnabled);
    if (!State.isSelectModeEnabled) {
        State.update("selectedMangaIds", []); // Clear selection on exit
    }
    applyFiltersAndSorting(); // Re-render to apply/remove selection styles
    updateSelectionUI();
}

function handleCardClick(manga, cardElement) {
    if (State.isSelectModeEnabled) {
        const mangaId = manga.id;
        const selectedIds = new Set(State.selectedMangaIds);
        if (selectedIds.has(mangaId)) {
            selectedIds.delete(mangaId);
        } else {
            selectedIds.add(mangaId);
        }
        State.update("selectedMangaIds", Array.from(selectedIds));

        // Update card visual state based on brutalist CSS in MangaCard.js
        const isSelected = selectedIds.has(mangaId);
        toggleClass(cardElement, "selected", isSelected);

        // Find the brutalist square checkbox and toggle opacity
        const checkbox = cardElement.querySelector(".absolute.top-2.left-2");
        if (checkbox) {
            toggleClass(checkbox, "opacity-0", !isSelected);
            toggleClass(checkbox, "opacity-100", isSelected);
        }

        updateSelectionUI(); // Update count in header
    } else {
        loadMangaForViewing(manga);
    }
}

function renderHomepageStructure() {
    const container = DOM.homepageContainer;
    if (!container) return;
    container.innerHTML = ""; // Clear container

    // --- Header Section (Editorial Layout) ---
    const headerContainer = document.createElement("div");
    addClass(
        headerContainer,
        "flex flex-col md:flex-row justify-between items-end border-b-4 border-black dark:border-white pb-6 mb-8 gap-4",
    );

    const titleWrapper = document.createElement("div");

    const jpAccent = document.createElement("div");
    addClass(jpAccent, "text-[#FF3366] font-black text-2xl tracking-widest leading-none mb-1 opacity-80");

    const title = document.createElement("h1");
    addClass(title, "font-cursive text-5xl sm:text-6xl md:text-7xl");
    setText(title, "ARCHIVE");

    titleWrapper.appendChild(jpAccent);
    titleWrapper.appendChild(title);
    headerContainer.appendChild(titleWrapper);

    // --- Command Bar (Search, Sort, Actions) ---
    const commandBar = document.createElement("div");
    addClass(
        commandBar,
        "w-full border-4 border-black dark:border-white bg-[#f4f4f0] dark:bg-[#0a0a0a] p-3 sm:p-4 mb-8 shadow-[8px_8px_0_0_#FF3366] flex flex-col xl:flex-row gap-4 xl:items-center justify-between z-20 relative",
    );

    // Search Box
    const searchWrapper = document.createElement("div");
    addClass(searchWrapper, "relative flex-grow max-w-2xl flex");

    const searchIconWrapper = document.createElement("div");
    addClass(
        searchIconWrapper,
        "absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black border-r-2 border-black dark:border-white z-10",
    );
    setHtml(searchIconWrapper, `<i data-lucide="search" width="20" height="20" stroke-width="3"></i>`);

    const searchInput = document.createElement("input");
    setAttribute(searchInput, {
        type: "search",
        id: "manga-search-input",
        placeholder: "SEARCH MANGAS...",
    });
    // Brutalist input styling
    addClass(
        searchInput,
        "w-full pl-16 pr-4 py-3 border-2 border-black dark:border-white font-space font-bold uppercase tracking-wider text-black dark:text-white bg-white dark:bg-black placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 focus:border-[#FF3366] dark:focus:border-[#FF3366] focus:shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] transition-colors rounded-none",
    );
    DOM.mangaSearchInput = searchInput;

    searchWrapper.appendChild(searchIconWrapper);
    searchWrapper.appendChild(searchInput);

    // Controls Right Side (Sort + Actions)
    const controlsRight = document.createElement("div");
    addClass(controlsRight, "flex flex-wrap items-center gap-3 sm:gap-4");

    // Sort Options mapping using our custom brutalist select
    const sortOptions = [
        { value: "custom", text: "CUSTOM ORDER" },
        { value: "title-asc", text: "TITLE (A-Z)" },
        { value: "title-desc", text: "TITLE (Z-A)" },
        { value: "chapters-asc", text: "CHAPTERS (LOW)" },
        { value: "chapters-desc", text: "CHAPTERS (HIGH)" },
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
        // Injecting brutalist button classes into the custom select
        buttonClass:
            "font-space font-bold uppercase text-sm tracking-wider border-2 border-black dark:border-white shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#fff] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0_0_#000] dark:hover:shadow-[6px_6px_0_0_#fff] bg-white dark:bg-[#0a0a0a] text-black dark:text-white rounded-none active:translate-y-0 active:translate-x-0 active:shadow-none transition-all",
    });
    DOM.mangaSortSelect = customSortSelect;
    controlsRight.appendChild(customSortSelect.element);

    // Action Buttons
    const addBtn = document.createElement("button");
    addClass(addBtn, "btn btn-primary whitespace-nowrap");
    addBtn.id = "add-manga-btn";
    setHtml(
        addBtn,
        `<i data-lucide="plus" class="inline-block mr-2 border-r-2 border-black/20 pr-2" width="20" height="20" stroke-width="3"></i>NEW ENTRY`,
    );
    addBtn.addEventListener("click", () => openMangaModal());
    DOM.addMangaBtn = addBtn;

    // Selection Actions Container (initially hidden)
    const selectionActionsContainer = document.createElement("div");
    selectionActionsContainer.id = "selection-actions";
    addClass(
        selectionActionsContainer,
        "hidden items-center space-x-3 bg-black dark:bg-white text-white dark:text-black px-4 py-1 border-2 border-black dark:border-white shadow-[4px_4px_0_0_#FF3366]",
    );

    const countSpan = document.createElement("span");
    countSpan.id = "selection-count";
    addClass(countSpan, "text-sm font-space font-bold tracking-wider");
    setText(countSpan, "0 VOLUMES SELECTED");

    const deleteBtn = document.createElement("button");
    deleteBtn.id = "delete-selected-btn";
    addClass(deleteBtn, "btn btn-danger !shadow-none !border-white dark:!border-black !py-1 !px-3");
    setHtml(deleteBtn, `<i data-lucide="trash-2" class="inline-block mr-2" width="16" height="16"></i>PURGE`);
    deleteBtn.addEventListener("click", () => confirmAndDelete(State.selectedMangaIds));

    selectionActionsContainer.appendChild(countSpan);
    selectionActionsContainer.appendChild(deleteBtn);
    DOM.selectionActionsContainer = selectionActionsContainer;

    // Select/Cancel Button
    const selectBtn = document.createElement("button");
    selectBtn.id = "manga-select-btn";
    addClass(selectBtn, "btn btn-secondary whitespace-nowrap");
    selectBtn.addEventListener("click", toggleSelectMode);
    DOM.mangaSelectBtn = selectBtn;

    controlsRight.appendChild(selectionActionsContainer);
    controlsRight.appendChild(addBtn);
    controlsRight.appendChild(selectBtn);

    commandBar.appendChild(searchWrapper);
    commandBar.appendChild(controlsRight);

    // --- Manga List Container ---
    const listContainer = document.createElement("div");
    // Adjusted negative margins to match the padding in MangaCard.js
    addClass(listContainer, "flex flex-wrap -m-3 sm:-m-4 relative z-0");
    listContainer.id = "manga-list";
    DOM.mangaList = listContainer;

    // --- Assemble ---
    container.appendChild(headerContainer);
    container.appendChild(commandBar);
    container.appendChild(listContainer);
}

export function renderMangaList(mangaArray) {
    if (!DOM.mangaList) return;
    DOM.mangaList.innerHTML = ""; // Clear only list

    if (!mangaArray || mangaArray.length === 0) {
        // Brutalist Empty State
        const emptyMessage = document.createElement("div");
        addClass(
            emptyMessage,
            "w-full py-20 px-4 flex flex-col items-center justify-center border-4 border-dashed border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/5 mt-8 max-w-3xl mx-auto",
        );
        setHtml(
            emptyMessage,
            `
            <div class="bg-[#FF3366] text-white p-4 mb-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] border-2 border-black dark:border-white transform -rotate-2">
                <i data-lucide="database" width="48" height="48" stroke-width="1.5"></i>
            </div>
            <h2 class="font-syne font-bold text-3xl uppercase tracking-tight text-center mb-2">No Results Found</h2>
            <p class="font-space font-bold uppercase text-sm tracking-widest opacity-60 text-center text-black dark:text-white">Click "New Entry" button to add a new manga.</p>
        `,
        );
        DOM.mangaList.appendChild(emptyMessage);
        renderIcons();
        return;
    }

    const cardResults = mangaArray.map((manga) =>
        createMangaCardElement(manga, {
            onClick: handleCardClick,
            onEdit: openMangaModal,
            onDelete: (mangaId) => confirmAndDelete([mangaId]),
        }),
    );
    const fragment = document.createDocumentFragment();
    const scrollSetupFunctions = [];

    cardResults.forEach((result) => {
        if (result) {
            const { cardWrapper, setupScrollTitle } = result;
            const card = cardWrapper.querySelector(".manga-card");
            const mangaId = getDataAttribute(card, "mangaId");
            const isSelected = State.selectedMangaIds.includes(parseInt(mangaId, 10));

            // Re-apply brutalist selection classes
            toggleClass(card, "selected", isSelected);
            const checkbox = card.querySelector(".absolute.top-2.left-2");
            if (checkbox) {
                toggleClass(checkbox, "opacity-0", !isSelected);
                toggleClass(checkbox, "opacity-100", isSelected);
            }

            scrollSetupFunctions.push(setupScrollTitle);
            fragment.appendChild(cardWrapper);
        }
    });
    DOM.mangaList.appendChild(fragment);

    // Now that cards are in DOM, setup scrolling titles
    scrollSetupFunctions.forEach((fn) => fn());

    renderIcons();
    initSortable();
    updateSelectionUI();
}

function initSortable() {
    if (!DOM.mangaList) return;
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    if (State.isSelectModeEnabled || State.mangaSortOrder !== "custom") {
        return;
    }

    sortableInstance = new Sortable(DOM.mangaList, {
        animation: 150,
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        handle: ".manga-card",
        filter: ".btn-icon", // Prevent dragging from buttons
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
    let mangaToRender = [...getMangaList()];

    if (DOM.mangaSearchInput && DOM.mangaSearchInput.value) {
        const query = DOM.mangaSearchInput.value.toLowerCase();
        mangaToRender = mangaToRender.filter((manga) => manga.title.toLowerCase().includes(query));
    }

    const sortOption = State.mangaSortOrder;
    if (sortOption !== "custom") {
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
