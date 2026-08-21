import { $, $$, DOM, h, setText, setVisible, toggleClass } from "@/core/dom-utils";
import type { Manga, MangaSortOrder } from "@/types";
import { PersistState, UIState, getMangaList, getTotalChapters } from "@/state";
import { type SelectItem, createSelect } from "@/components/custom-select";
import { confirmAndDelete, openMangaModal, saveMangaOrder } from "./manga-actions";
import { createGenerationGuard, debounce } from "@/core/utils";
import Sortable from "sortablejs";
import { createMangaCardElement } from "./manga-card";
import { enterManga } from "@/app/view-router";
import { iconSvg } from "@/core/icons";
import { openSettings } from "@/settings";

let sortableInstance: Sortable | null = null;
const titleScrollGuard = createGenerationGuard();

function syncCardSelectionState(cardElement: HTMLElement | null): void {
    if (!cardElement) return;

    const { mangaId } = cardElement.dataset;
    const isSelected = mangaId !== undefined && UIState.selection.selectedMangaIds.includes(mangaId);

    toggleClass(cardElement, "selected", isSelected);
}

function updateSelectionUI(): void {
    const { addMangaBtn, mangaList, mangaSelectBtn, selectionActionsContainer } = DOM;
    if (!selectionActionsContainer || !addMangaBtn || !mangaSelectBtn) return;

    const { isSelectModeEnabled: isEnabled, selectedMangaIds } = UIState.selection;
    const count = selectedMangaIds.length;

    setVisible(selectionActionsContainer, isEnabled);
    setVisible(addMangaBtn, !isEnabled);
    toggleClass(mangaList, "selection-mode-active", isEnabled);

    if (isEnabled) {
        mangaSelectBtn.className = "btn-primary whitespace-nowrap";

        const countText = $("#selection-count", selectionActionsContainer);
        const deleteBtn = $<HTMLButtonElement>("#delete-selected-btn", selectionActionsContainer);

        setText(countText, `${count} selected`);
        if (deleteBtn) {
            deleteBtn.disabled = count === 0;
            toggleClass(deleteBtn, "opacity-40 cursor-not-allowed", count === 0);
        }
        mangaSelectBtn.replaceChildren(
            iconSvg("XSquare", { size: 15, strokeWidth: 2 }),
            document.createTextNode("Cancel"),
        );
    } else {
        mangaSelectBtn.className = "btn-secondary whitespace-nowrap";
        mangaSelectBtn.replaceChildren(
            iconSvg("CheckSquare", { size: 15, strokeWidth: 2 }),
            document.createTextNode("Select"),
        );
    }
}

function syncAllCardsSelectionState(): void {
    const cards = DOM.mangaList ? $$(".manga-card", DOM.mangaList) : [];
    cards.forEach((card) => syncCardSelectionState(card));
}

function toggleSelectMode(): void {
    const { isSelectModeEnabled } = UIState.selection;
    UIState.update("selection", {
        isSelectModeEnabled: !isSelectModeEnabled,
        selectedMangaIds: [],
    });
}

function handleCardClick(manga: Manga): void {
    const { isSelectModeEnabled, selectedMangaIds } = UIState.selection;
    if (isSelectModeEnabled) {
        const selectedIds = new Set(selectedMangaIds);
        if (selectedIds.has(manga.id)) {
            selectedIds.delete(manga.id);
        } else {
            selectedIds.add(manga.id);
        }
        UIState.update("selection", { isSelectModeEnabled: true, selectedMangaIds: [...selectedIds] });
    } else {
        enterManga(manga);
    }
}

function renderHomepageStructure(): void {
    const container = DOM.homepageContainer;
    if (!container) return;
    // --- Header / Toolbar ---
    const pageHeader = h("div", {
        className: "w-full flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-5 mb-6 z-20 relative",
    });

    // Title block
    const title = h(
        "h1",
        {
            className:
                "font-serif text-xl sm:text-2xl font-medium tracking-tight text-ink dark:text-paper leading-none",
        },
        "Library",
    );
    const titleBlock = h("div", { className: "flex items-center gap-2.5 shrink-0" }, title);

    // Search Box
    const searchIconWrapper = h("div", {
        className: "absolute left-4 top-0 bottom-0 flex items-center justify-center text-ink/35 dark:text-paper/35",
    });
    searchIconWrapper.append(iconSvg("Search", { size: 17, strokeWidth: 2 }));

    const searchInput = h("input", {
        className: "input-field w-full pl-11 pr-4",
        id: "manga-search-input",
        placeholder: "Search your library…",
        type: "search",
    });
    const searchWrapper = h("div", { className: "relative flex-1 lg:max-w-md flex" }, searchIconWrapper, searchInput);

    // Controls Right Side
    const controlsRight = h("div", { className: "flex flex-wrap items-center gap-2.5" });

    const sortOptions: SelectItem<MangaSortOrder>[] = [
        { text: "Custom order", value: "custom" },
        { text: "Title (A–Z)", value: "title-asc" },
        { text: "Title (Z–A)", value: "title-desc" },
        { text: "Chapters (low–high)", value: "chapters-asc" },
        { text: "Chapters (high–low)", value: "chapters-desc" },
    ];

    const customSortSelect = createSelect<MangaSortOrder>({
        id: "manga-sort-select",
        items: sortOptions,
        onChange: (newValue) => {
            PersistState.update("mangaSortOrder", newValue);
        },
        value: PersistState.mangaSortOrder,
        width: "w-52",
    });
    controlsRight.append(customSortSelect.element);

    // Settings Button
    const settingsBtn = h("button", {
        className: "btn-icon-solid",
        id: "open-settings-btn",
        title: "Settings",
    });
    settingsBtn.replaceChildren(iconSvg("Settings", { size: 17, strokeWidth: 2 }));
    settingsBtn.addEventListener("click", openSettings);

    // Action Buttons
    const addBtn = h("button", {
        className: "btn-primary whitespace-nowrap",
        id: "add-manga-btn",
    });
    addBtn.replaceChildren(iconSvg("Plus", { size: 17, strokeWidth: 2.5 }), document.createTextNode("Add manga"));
    addBtn.addEventListener("click", () => openMangaModal());

    // Selection Actions Container
    const selectionActionsContainer = h("div", {
        className: "flex items-center gap-3 surface rounded-full pl-4 pr-1.5 py-1.5",
        hidden: true,
        id: "selection-actions",
    });

    const countSpan = h(
        "span",
        { className: "text-sm font-medium text-ink/70 dark:text-paper/70 whitespace-nowrap", id: "selection-count" },
        "0 selected",
    );

    const deleteBtn = h("button", {
        className: "btn-danger !px-3.5 !py-1.5 !text-xs",
        id: "delete-selected-btn",
    });
    deleteBtn.replaceChildren(iconSvg("Trash2", { size: 14, strokeWidth: 2 }), document.createTextNode("Delete"));
    deleteBtn.addEventListener("click", () => confirmAndDelete(UIState.selection.selectedMangaIds));

    selectionActionsContainer.append(countSpan, deleteBtn);

    // Select/Cancel Button
    const selectBtn = h("button", { className: "btn-secondary whitespace-nowrap", id: "manga-select-btn" });
    selectBtn.addEventListener("click", toggleSelectMode);

    controlsRight.append(selectionActionsContainer, addBtn, selectBtn, settingsBtn);

    pageHeader.append(titleBlock, searchWrapper, controlsRight);

    // --- Manga List Container ---
    const listContainer = h("div", {
        className: "flex flex-wrap -m-2.5 sm:-m-3 relative z-0",
        id: "manga-list",
    });
    container.replaceChildren(pageHeader, listContainer);
}

function createEmptyStateMessage({ title, body }: { body: string; title: string }): HTMLDivElement {
    return h(
        "div",
        {
            className:
                "w-full py-24 px-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-line dark:border-line-dark mt-6 max-w-2xl mx-auto",
        },
        h(
            "div",
            {
                className:
                    "w-14 h-14 rounded-full surface flex items-center justify-center mb-5 text-ink/40 dark:text-paper/40",
            },
            iconSvg("Library", { size: 24, strokeWidth: 1.5 }),
        ),
        h("h2", { className: "font-serif text-2xl font-medium text-ink dark:text-paper text-center mb-2" }, title),
        h("p", { className: "text-sm text-ink/50 dark:text-paper/45 text-center" }, body),
    );
}

function renderMangaList(mangaArray: Manga[]): void {
    if (!DOM.mangaList) return;
    const { mangaList } = DOM;

    if (mangaArray.length === 0) {
        const isEmptyLibrary = getMangaList().length === 0;
        const emptyMessage = createEmptyStateMessage(
            isEmptyLibrary
                ? { body: "Add a manga to start building your library.", title: "Your shelf is empty" }
                : { body: "Try a different search.", title: "No results found" },
        );
        mangaList.replaceChildren(emptyMessage);
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
    mangaList.replaceChildren(fragment);

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

    if (UIState.selection.isSelectModeEnabled || PersistState.mangaSortOrder !== "custom") {
        return;
    }

    sortableInstance = new Sortable(mangaList, {
        animation: 150,
        dragClass: "sortable-drag",
        filter: ".btn-icon, .card-actions",
        ghostClass: "sortable-ghost",
        handle: ".manga-card",
        onEnd: (event) => {
            const newOrderIds = [...event.to.children]
                .map((cardWrapper) => $(".manga-card", cardWrapper)?.dataset.mangaId)
                .filter((id): id is string => id !== undefined);
            saveMangaOrder(newOrderIds);
        },
        preventOnFilter: true,
    });
}

function updateSelectionUIState(): void {
    updateSelectionUI();
    syncAllCardsSelectionState();
}

export function initHomePageUI(): void {
    PersistState.onChange("mangaList", applyFiltersAndSorting);
    PersistState.onChange("mangaSortOrder", applyFiltersAndSorting);
    UIState.onChange("selection", updateSelectionUIState);

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
