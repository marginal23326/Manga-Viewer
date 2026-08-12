import { $, $$, DOM, addClass, getDataAttribute, h, removeClass, setText, toggleClass } from "@/core/dom-utils";
import type { Manga, MangaSortOrder } from "@/types";
import { PersistState, UIState } from "@/state/state";
import { type SelectItem, createSelect } from "@/components/custom-select";
import { confirmAndDelete, loadMangaForViewing, openMangaModal, saveMangaOrder } from "@/features/manga-manager";
import { createGenerationGuard, debounce, getTotalChapters } from "@/core/utils";
import Sortable from "sortablejs";
import { createMangaCardElement } from "@/components/manga-card";
import { getMangaList } from "@/state/manga-library";
import { iconSvg } from "@/core/icons";

let sortableInstance: Sortable | null = null;
const titleScrollGuard = createGenerationGuard();

function syncCardSelectionState(cardElement: HTMLElement | null): void {
    if (!cardElement) return;

    const mangaId = getDataAttribute(cardElement, "mangaId");
    const isSelected = mangaId !== undefined && UIState.selectedMangaIds.includes(mangaId);

    toggleClass(cardElement, "selected", isSelected);
}

function updateSelectionUI(): void {
    const { addMangaBtn, mangaList, mangaSelectBtn, selectionActionsContainer } = DOM;
    if (!selectionActionsContainer || !addMangaBtn || !mangaSelectBtn) return;

    const count = UIState.selectedMangaIds.length;
    const isEnabled = UIState.isSelectModeEnabled;

    toggleClass(selectionActionsContainer, "hidden", !isEnabled);
    toggleClass(selectionActionsContainer, "flex", isEnabled);
    toggleClass(addMangaBtn, "hidden", isEnabled);
    toggleClass(mangaList, "selection-mode-active", isEnabled);

    // Update Select button styling to brutalist active state
    if (isEnabled) {
        removeClass(mangaSelectBtn, "btn-secondary");
        addClass(mangaSelectBtn, "btn-primary");

        const countText = $("#selection-count", selectionActionsContainer);
        const deleteBtn = $<HTMLButtonElement>("#delete-selected-btn", selectionActionsContainer);

        setText(countText, `${count} VOLUMES SELECTED`);
        if (deleteBtn) {
            deleteBtn.disabled = count === 0;
            toggleClass(deleteBtn, "opacity-50 cursor-not-allowed saturate-0", count === 0);
        }
        mangaSelectBtn.replaceChildren(
            iconSvg("XSquare", { className: "inline-block mr-2", size: 20, strokeWidth: 2 }),
            document.createTextNode("CANCEL"),
        );
    } else {
        removeClass(mangaSelectBtn, "btn-primary");
        addClass(mangaSelectBtn, "btn-secondary");
        mangaSelectBtn.replaceChildren(
            iconSvg("CheckSquare", { className: "inline-block mr-2", size: 20, strokeWidth: 2 }),
            document.createTextNode("SELECT"),
        );
    }
}

function syncAllCardsSelectionState(): void {
    const cards = DOM.mangaList ? $$(".manga-card", DOM.mangaList) : [];
    cards.forEach((card) => syncCardSelectionState(card));
}

function toggleSelectMode(): void {
    UIState.update("isSelectModeEnabled", !UIState.isSelectModeEnabled);
    if (!UIState.isSelectModeEnabled) {
        UIState.update("selectedMangaIds", []);
    }
    updateSelectionUI();
    syncAllCardsSelectionState();
}

function handleCardClick(manga: Manga, cardElement: HTMLDivElement): void {
    if (UIState.isSelectModeEnabled) {
        const mangaId = manga.id;
        const selectedIds = new Set(UIState.selectedMangaIds);
        if (selectedIds.has(mangaId)) {
            selectedIds.delete(mangaId);
        } else {
            selectedIds.add(mangaId);
        }
        UIState.update("selectedMangaIds", [...selectedIds]);

        syncCardSelectionState(cardElement);
        updateSelectionUI();
    } else {
        loadMangaForViewing(manga);
    }
}

function renderHomepageStructure(): void {
    const container = DOM.homepageContainer;
    if (!container) return;
    container.innerHTML = "";

    // --- Header Section ---
    const headerContainer = h("div", {
        className: "flex justify-center items-end border-b-4 border-black dark:border-white pb-6 mb-8 gap-4 w-full",
    });

    const jpAccent = h(
        "div",
        {
            className:
                "text-accent font-black text-2xl sm:text-3xl md:text-4xl tracking-widest leading-none opacity-80",
        },
        "MANGA",
    );
    const title = h("h1", { className: "font-cursive text-2xl sm:text-3xl md:text-4xl" }, "LIBRARY");

    const titleWrapper = h("div", { className: "flex items-center gap-2 sm:gap-3" }, jpAccent, title);
    headerContainer.append(titleWrapper);

    // --- Command Bar ---
    const commandBar = h("div", {
        className:
            "w-full brutal-box-xl-accent bg-paper dark:bg-ink p-3 sm:p-4 mb-8 flex flex-col xl:flex-row gap-4 xl:items-center justify-between z-20 relative",
    });

    // Search Box
    const searchIconWrapper = h("div", {
        className:
            "absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black border-r-2 border-black dark:border-white z-10",
    });
    searchIconWrapper.append(iconSvg("Search", { size: 20, strokeWidth: 3 }));

    const searchInput = h("input", {
        className:
            "w-full pl-16 pr-4 py-3 brutal-border font-space font-bold uppercase tracking-wider text-black dark:text-white bg-white dark:bg-black placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 focus:border-accent dark:focus:border-accent focus:shadow-[inset_4px_4px_0_0_rgba(0,0,0,0.1)] transition-colors rounded-none",
        id: "manga-search-input",
        placeholder: "SEARCH MANGAS...",
        type: "search",
    });
    const searchWrapper = h("div", { className: "relative flex-grow max-w-2xl flex" }, searchIconWrapper, searchInput);

    // Controls Right Side
    const controlsRight = h("div", { className: "flex flex-wrap items-center gap-3 sm:gap-4" });

    const sortOptions: SelectItem<MangaSortOrder>[] = [
        { text: "CUSTOM ORDER", value: "custom" },
        { text: "TITLE (A-Z)", value: "title-asc" },
        { text: "TITLE (Z-A)", value: "title-desc" },
        { text: "CHAPTERS (LOW)", value: "chapters-asc" },
        { text: "CHAPTERS (HIGH)", value: "chapters-desc" },
    ];

    const customSortSelect = createSelect<MangaSortOrder>({
        buttonClass:
            "font-space font-bold uppercase text-sm tracking-wider brutal-box rounded-none bg-white dark:bg-ink text-black dark:text-white brutal-box-hover transition-all",
        id: "manga-sort-select",
        items: sortOptions,
        onChange: (newValue) => {
            PersistState.update("mangaSortOrder", newValue);
        },
        value: PersistState.mangaSortOrder,
        width: "w-52",
    });
    controlsRight.append(customSortSelect.element);

    // Action Buttons
    const addBtn = h("button", {
        className: "btn btn-primary whitespace-nowrap",
        id: "add-manga-btn",
    });
    addBtn.replaceChildren(
        iconSvg("Plus", { className: "inline-block mr-2 border-r-2 border-black/20 pr-2", size: 20, strokeWidth: 3 }),
        document.createTextNode("NEW ENTRY"),
    );
    addBtn.addEventListener("click", () => openMangaModal());

    // Selection Actions Container
    const selectionActionsContainer = h("div", {
        className:
            "hidden items-center space-x-3 bg-black dark:bg-white text-white dark:text-black px-4 py-1 brutal-border brutal-shadow-accent",
        id: "selection-actions",
    });

    const countSpan = h(
        "span",
        { className: "text-sm font-space font-bold tracking-wider", id: "selection-count" },
        "0 VOLUMES SELECTED",
    );

    const deleteBtn = h("button", {
        className: "btn btn-danger !shadow-none !border-white dark:!border-black !py-1 !px-3",
        id: "delete-selected-btn",
    });
    deleteBtn.replaceChildren(
        iconSvg("Trash2", { className: "inline-block mr-2", size: 16, strokeWidth: 2 }),
        document.createTextNode("PURGE"),
    );
    deleteBtn.addEventListener("click", () => confirmAndDelete(UIState.selectedMangaIds));

    selectionActionsContainer.append(countSpan, deleteBtn);

    // Select/Cancel Button
    const selectBtn = h("button", { className: "btn btn-secondary whitespace-nowrap", id: "manga-select-btn" });
    selectBtn.addEventListener("click", toggleSelectMode);

    controlsRight.append(selectionActionsContainer, addBtn, selectBtn);

    commandBar.append(searchWrapper, controlsRight);

    // --- Manga List Container ---
    const listContainer = h("div", {
        className: "flex flex-wrap -m-3 sm:-m-4 relative z-0",
        id: "manga-list",
    });
    container.append(headerContainer, commandBar, listContainer);
}

function renderMangaList(mangaArray: Manga[]): void {
    if (!DOM.mangaList) return;
    const { mangaList } = DOM;
    mangaList.innerHTML = "";

    if (mangaArray.length === 0) {
        const emptyMessage = h(
            "div",
            {
                className:
                    "w-full py-20 px-4 flex flex-col items-center justify-center border-4 border-dashed border-black/30 dark:border-white/30 bg-black/5 dark:bg-white/5 mt-8 max-w-3xl mx-auto",
            },
            h(
                "div",
                {
                    className:
                        "bg-accent text-white p-4 mb-6 shadow-[8px_8px_0_0_#000] dark:shadow-[8px_8px_0_0_#fff] brutal-border -rotate-2",
                },
                iconSvg("Database", { size: 48, strokeWidth: 1.5 }),
            ),
            h(
                "h2",
                { className: "font-syne font-bold text-3xl uppercase tracking-tight text-center mb-2" },
                "No Results Found",
            ),
            h(
                "p",
                {
                    className:
                        "font-space font-bold uppercase text-sm tracking-widest opacity-60 text-center text-black dark:text-white",
                },
                'Click "New Entry" button to add a new manga.',
            ),
        );
        mangaList.append(emptyMessage);
        updateSelectionUI();
        return;
    }

    const cardResults = mangaArray.map((manga) =>
        createMangaCardElement(manga, {
            onClick: handleCardClick,
            onDelete: (mangaId) => confirmAndDelete([mangaId]),
            onEdit: openMangaModal,
        }),
    );
    const fragment = document.createDocumentFragment();
    const scrollSetupFunctions: (() => void)[] = [];

    cardResults.forEach(({ cardWrapper, setupScrollTitle }) => {
        const card = $(".manga-card", cardWrapper);
        syncCardSelectionState(card);
        scrollSetupFunctions.push(setupScrollTitle);
        fragment.append(cardWrapper);
    });
    mangaList.append(fragment);

    // Now that cards are in DOM, setup scrolling titles
    const currentSetupToken = titleScrollGuard.next();
    const runTitleScrollSetups = (): void => {
        if (!titleScrollGuard.isCurrent(currentSetupToken)) return;
        scrollSetupFunctions.forEach((fn) => fn());
    };

    runTitleScrollSetups();
    requestAnimationFrame(runTitleScrollSetups);
    void document.fonts?.ready.then(runTitleScrollSetups);

    initSortable();
    updateSelectionUI();
}

function initSortable(): void {
    if (!DOM.mangaList) return;
    const { mangaList } = DOM;

    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    if (UIState.isSelectModeEnabled || PersistState.mangaSortOrder !== "custom") {
        return;
    }

    sortableInstance = new Sortable(mangaList, {
        animation: 150,
        dragClass: "sortable-drag",
        filter: ".btn-icon",
        ghostClass: "sortable-ghost",
        handle: ".manga-card",
        onEnd: (event) => {
            const newOrderIds = [...event.to.children]
                .map((cardWrapper) => getDataAttribute($(".manga-card", cardWrapper), "mangaId"))
                .filter((id): id is string => id !== undefined);
            saveMangaOrder(newOrderIds);
        },
        preventOnFilter: true,
    });
}

export function initHomePageUI(): void {
    PersistState.onChange("mangaList", applyFiltersAndSorting);
    PersistState.onChange("mangaSortOrder", applyFiltersAndSorting);

    renderHomepageStructure();
    applyFiltersAndSorting();

    if (DOM.mangaSearchInput) {
        const handleSearchInput = debounce(() => {
            applyFiltersAndSorting();
        });
        DOM.mangaSearchInput.addEventListener("input", handleSearchInput);
    }
}

function applyFiltersAndSorting(): void {
    let mangaToRender = getMangaList();

    const searchInput = DOM.mangaSearchInput as HTMLInputElement | null;
    if (searchInput?.value) {
        const query = searchInput.value.toLowerCase();
        mangaToRender = mangaToRender.filter((manga) => manga.title.toLowerCase().includes(query));
    }

    const sortOption = PersistState.mangaSortOrder;
    if (sortOption !== "custom") {
        mangaToRender = mangaToRender.toSorted((a, b) => {
            switch (sortOption) {
                case "title-asc": {
                    return a.title.localeCompare(b.title);
                }
                case "title-desc": {
                    return b.title.localeCompare(a.title);
                }
                case "chapters-asc": {
                    return getTotalChapters(a) - getTotalChapters(b);
                }
                case "chapters-desc": {
                    return getTotalChapters(b) - getTotalChapters(a);
                }
                default: {
                    return 0;
                }
            }
        });
    }

    renderMangaList(mangaToRender);
}
