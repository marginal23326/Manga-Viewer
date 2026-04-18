import Sortable from "sortablejs";

import { createSelect } from "../components/CustomSelect";
import { createMangaCardElement } from "../components/MangaCard";
import { DOM, addClass, setText, getDataAttribute, toggleClass, setHtml, removeClass, h } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";
import { getMangaList } from "../core/MangaLibrary";
import { PersistState, UIState } from "../core/State";
import { debounce } from "../core/Utils";
import { openMangaModal, loadMangaForViewing, saveMangaOrder, confirmAndDelete } from "../features/MangaManager";

let sortableInstance = null;
let titleScrollSetupVersion = 0;

function updateSelectionUI() {
    const { selectionActionsContainer, addMangaBtn, mangaSelectBtn } = DOM;
    if (!selectionActionsContainer || !addMangaBtn || !mangaSelectBtn) return;

    const count = UIState.selectedMangaIds.length;
    const isEnabled = UIState.isSelectModeEnabled;

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
    UIState.update("isSelectModeEnabled", !UIState.isSelectModeEnabled);
    if (!UIState.isSelectModeEnabled) {
        UIState.update("selectedMangaIds", []);
    }
    applyFiltersAndSorting(); // Re-render to apply/remove selection styles
    updateSelectionUI();
}

function handleCardClick(manga, cardElement) {
    if (UIState.isSelectModeEnabled) {
        const mangaId = manga.id;
        const selectedIds = new Set(UIState.selectedMangaIds);
        if (selectedIds.has(mangaId)) {
            selectedIds.delete(mangaId);
        } else {
            selectedIds.add(mangaId);
        }
        UIState.update("selectedMangaIds", Array.from(selectedIds));

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
    container.innerHTML = "";

    // --- Header Section ---
    const headerContainer = h("div", {
        className:
            "flex flex-col md:flex-row justify-between items-end border-b-4 border-black dark:border-white pb-6 mb-8 gap-4",
    });

    const jpAccent = h(
        "div",
        { className: "text-[#FF3366] font-black text-2xl tracking-widest leading-none mb-1 opacity-80" },
        "MANGA",
    );
    const title = h("h1", { className: "font-cursive text-5xl sm:text-6xl md:text-7xl" }, "ARCHIVE");

    const titleWrapper = h("div", {}, jpAccent, title);
    headerContainer.appendChild(titleWrapper);

    // --- Command Bar ---
    const commandBar = h("div", {
        className:
            "w-full border-4 border-black dark:border-white bg-[#f4f4f0] dark:bg-[#0a0a0a] p-3 sm:p-4 mb-8 shadow-[8px_8px_0_0_#FF3366] flex flex-col xl:flex-row gap-4 xl:items-center justify-between z-20 relative",
    });

    // Search Box
    const searchIconWrapper = h("div", {
        className:
            "absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black border-r-2 border-black dark:border-white z-10",
    });
    setHtml(searchIconWrapper, `<i data-lucide="search" width="20" height="20" stroke-width="3"></i>`);

    const searchInput = h("input", {
        type: "search",
        id: "manga-search-input",
        placeholder: "SEARCH MANGAS...",
        className:
            "w-full pl-16 pr-4 py-3 brutal-border font-space font-bold uppercase tracking-wider text-black dark:text-white bg-white dark:bg-black placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 focus:border-accent dark:focus:border-accent focus:shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] transition-colors rounded-none",
    });
    DOM.mangaSearchInput = searchInput;

    const searchWrapper = h("div", { className: "relative flex-grow max-w-2xl flex" }, searchIconWrapper, searchInput);

    // Controls Right Side
    const controlsRight = h("div", { className: "flex flex-wrap items-center gap-3 sm:gap-4" });

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
        value: PersistState.mangaSortOrder,
        onChange: (newValue) => {
            PersistState.update("mangaSortOrder", newValue);
        },
        width: "w-52",
        buttonClass:
            "font-space font-bold uppercase text-sm tracking-wider brutal-box rounded-none bg-white dark:bg-ink text-black dark:text-white brutal-box-hover transition-all",
    });
    DOM.mangaSortSelect = customSortSelect;
    controlsRight.appendChild(customSortSelect.element);

    // Action Buttons
    const addBtn = h("button", {
        id: "add-manga-btn",
        className: "btn btn-primary whitespace-nowrap",
    });
    setHtml(
        addBtn,
        `<i data-lucide="plus" class="inline-block mr-2 border-r-2 border-black/20 pr-2" width="20" height="20" stroke-width="3"></i>NEW ENTRY`,
    );
    addBtn.addEventListener("click", () => openMangaModal());
    DOM.addMangaBtn = addBtn;

    // Selection Actions Container
    const selectionActionsContainer = h("div", {
        id: "selection-actions",
        className:
            "hidden items-center space-x-3 bg-black dark:bg-white text-white dark:text-black px-4 py-1 brutal-border shadow-[4px_4px_0_0_#FF3366]",
    });

    const countSpan = h(
        "span",
        { id: "selection-count", className: "text-sm font-space font-bold tracking-wider" },
        "0 VOLUMES SELECTED",
    );

    const deleteBtn = h("button", {
        id: "delete-selected-btn",
        className: "btn btn-danger !shadow-none !border-white dark:!border-black !py-1 !px-3",
    });
    setHtml(deleteBtn, `<i data-lucide="trash-2" class="inline-block mr-2" width="16" height="16"></i>PURGE`);
    deleteBtn.addEventListener("click", () => confirmAndDelete(UIState.selectedMangaIds));

    selectionActionsContainer.appendChild(countSpan);
    selectionActionsContainer.appendChild(deleteBtn);
    DOM.selectionActionsContainer = selectionActionsContainer;

    // Select/Cancel Button
    const selectBtn = h("button", { id: "manga-select-btn", className: "btn btn-secondary whitespace-nowrap" });
    selectBtn.addEventListener("click", toggleSelectMode);
    DOM.mangaSelectBtn = selectBtn;

    controlsRight.appendChild(selectionActionsContainer);
    controlsRight.appendChild(addBtn);
    controlsRight.appendChild(selectBtn);

    commandBar.appendChild(searchWrapper);
    commandBar.appendChild(controlsRight);

    // --- Manga List Container ---
    const listContainer = h("div", {
        id: "manga-list",
        className: "flex flex-wrap -m-3 sm:-m-4 relative z-0",
    });
    DOM.mangaList = listContainer;

    container.appendChild(headerContainer);
    container.appendChild(commandBar);
    container.appendChild(listContainer);
}

function renderMangaList(mangaArray) {
    if (!DOM.mangaList) return;
    DOM.mangaList.innerHTML = "";

    if (!mangaArray || mangaArray.length === 0) {
        const emptyMessage = h("div", {
            className:
                "w-full py-20 px-4 flex flex-col items-center justify-center border-4 border-dashed border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/5 mt-8 max-w-3xl mx-auto",
        });
        setHtml(
            emptyMessage,
            `
            <div class="bg-[#FF3366] text-white p-4 mb-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] dark:shadow-[8px_8px_0_0_rgba(255,255,255,1)] brutal-border transform -rotate-2">
                <i data-lucide="database" width="48" height="48" stroke-width="1.5"></i>
            </div>
            <h2 class="font-syne font-bold text-3xl uppercase tracking-tight text-center mb-2">No Results Found</h2>
            <p class="font-space font-bold uppercase text-sm tracking-widest opacity-60 text-center text-black dark:text-white">Click "New Entry" button to add a new manga.</p>
        `,
        );
        DOM.mangaList.appendChild(emptyMessage);
        renderIcons();
        updateSelectionUI();
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
            const isSelected = UIState.selectedMangaIds.includes(parseInt(mangaId, 10));

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
    const currentSetupVersion = ++titleScrollSetupVersion;
    const runTitleScrollSetups = () => {
        if (currentSetupVersion !== titleScrollSetupVersion) return;
        scrollSetupFunctions.forEach((fn) => fn());
    };

    runTitleScrollSetups();
    requestAnimationFrame(runTitleScrollSetups);
    document.fonts?.ready.then(runTitleScrollSetups);

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

    if (UIState.isSelectModeEnabled || PersistState.mangaSortOrder !== "custom") {
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
    PersistState.addEventListener("state:mangaList", applyFiltersAndSorting);
    PersistState.addEventListener("state:mangaSortOrder", applyFiltersAndSorting);

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

    const sortOption = PersistState.mangaSortOrder;
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
