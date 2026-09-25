import { $, $$, h, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { MANGA_SORT_ORDER_OPTIONS, type Manga, type MangaSortOrder } from "@/types";
import { PersistState, UIState, getMangaList } from "@/state";
import { confirmAndDelete, openMangaModal, saveMangaOrder } from "./manga-actions";
import { createIconButton, iconSvg } from "@/core/icons";
import { createMangaCardElement } from "./manga-card";
import { createSelect } from "@/components/custom-select";
import { createThemeSegmentedControl } from "@/app/theme";
import { debounce } from "@/core/utils";
import { openSettings } from "@/settings";

export const homepageContainer = h("div", {
    className: "w-full px-6 pt-4 pb-12 max-w-7xl mx-auto",
    hidden: true,
    id: "homepage-container",
});

interface CardEntry {
    cardWrapper: HTMLDivElement;
    manga: Manga;
}

let mangaListElement: HTMLDivElement | null = null;
let mangaSearchInput: HTMLInputElement | null = null;
let addMangaButton: HTMLButtonElement | null = null;
let mangaSelectButton: HTMLButtonElement | null = null;
let selectionActionsElement: HTMLDivElement | null = null;
let selectionCountElement: HTMLSpanElement | null = null;
let deleteSelectedButton: HTMLButtonElement | null = null;
const cardCache = new Map<string, CardEntry>();

function isCustomSortActive(): boolean {
    return PersistState.mangaSortOrder === "custom" && !UIState.isSelectEnabled && !getSearchQuery();
}

function syncCardSelectionState(cardElement: HTMLElement | null): void {
    if (!cardElement) return;
    const { mangaId } = cardElement.dataset;
    toggleClass(cardElement, "selected", mangaId !== undefined && UIState.selectedMangaIds.includes(mangaId));
}

function updateSelectionUI(): void {
    if (!selectionActionsElement || !addMangaButton || !mangaSelectButton) return;

    const { isSelectEnabled: isEnabled, selectedMangaIds } = UIState;
    const count = selectedMangaIds.length;

    setVisible(selectionActionsElement, isEnabled);
    setVisible(addMangaButton, !isEnabled);
    toggleClass(mangaListElement, "selection-active", isEnabled);
    toggleClass(mangaSelectButton, "btn-primary", isEnabled);
    toggleClass(mangaSelectButton, "btn-secondary", !isEnabled);

    if (isEnabled) {
        setText(selectionCountElement, `${count} selected`);
        if (deleteSelectedButton) deleteSelectedButton.disabled = count === 0;
        mangaSelectButton.replaceChildren(iconSvg("XSquare", { size: 15 }), "Cancel");
    } else {
        mangaSelectButton.replaceChildren(iconSvg("CheckSquare", { size: 15 }), "Select");
    }
}

function syncAllCardsSelectionState(): void {
    const cards = mangaListElement ? $$(".manga-card", mangaListElement) : [];
    cards.forEach((card) => syncCardSelectionState(card));
}

function toggleSelection(): void {
    UIState.update("isSelectEnabled", !UIState.isSelectEnabled);
    UIState.update("selectedMangaIds", []);
}

function handleCardClick(manga: Manga): void {
    if (UIState.isSelectEnabled) {
        const selectedIds = new Set(UIState.selectedMangaIds);
        if (selectedIds.has(manga.id)) selectedIds.delete(manga.id);
        else selectedIds.add(manga.id);
        UIState.update("selectedMangaIds", [...selectedIds]);
    } else {
        PersistState.update("currentMangaId", manga.id);
    }
}

function renderHomepageStructure(): void {
    const pageHeader = h("div", {
        className: "w-full flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-5 mb-6 z-20 relative",
    });

    const titleBlock = h(
        "div",
        { className: "flex items-center gap-2.5 shrink-0" },
        h(
            "h1",
            {
                className:
                    "font-serif text-xl sm:text-2xl font-medium tracking-tight text-ink dark:text-paper leading-none",
            },
            "Library",
        ),
    );

    const searchIconWrapper = h(
        "div",
        { className: "absolute left-4 top-0 bottom-0 flex items-center justify-center text-faint" },
        iconSvg("Search", { size: 17 }),
    );
    const searchInput = h("input", {
        className: "input-field w-full pl-11 pr-4",
        oninput: debounce(() => applyFiltersAndSorting()),
        placeholder: "Search your library…",
        type: "search",
    });
    const searchWrapper = h("div", { className: "relative flex-1 lg:max-w-md flex" }, searchIconWrapper, searchInput);

    const controlsRight = h("div", { className: "flex flex-wrap items-center gap-2.5" });
    const customSortSelect = createSelect<MangaSortOrder>({
        items: MANGA_SORT_ORDER_OPTIONS,
        onChange: (newValue) => PersistState.update("mangaSortOrder", newValue),
        value: PersistState.mangaSortOrder,
        width: "w-52",
    });

    const settingsBtn = createIconButton("Settings", {
        className: "btn-icon-solid",
        iconOptions: { size: 17 },
        onClick: openSettings,
        tooltip: "Settings",
    });
    const themeControl = createThemeSegmentedControl();

    const addBtn = h(
        "button",
        { className: "btn-primary whitespace-nowrap", onclick: () => openMangaModal() },
        iconSvg("Plus", { size: 17, strokeWidth: 2.5 }),
        "Add manga",
    );

    const countSpan = h("span", { className: "text-sm font-medium text-secondary whitespace-nowrap" }, "0 selected");
    selectionCountElement = countSpan;

    const deleteBtn = h(
        "button",
        { className: "btn-danger btn-sm", onclick: () => confirmAndDelete(UIState.selectedMangaIds) },
        iconSvg("Trash2", { size: 14 }),
        "Delete",
    );
    deleteSelectedButton = deleteBtn;

    const selectionActionsContainer = h(
        "div",
        { className: "flex items-center gap-3 surface rounded-full pl-4 pr-1.5 py-1.5", hidden: true },
        countSpan,
        deleteBtn,
    );
    const selectBtn = h("button", { className: "btn-secondary whitespace-nowrap", onclick: toggleSelection });

    controlsRight.append(
        customSortSelect.element,
        selectionActionsContainer,
        addBtn,
        selectBtn,
        themeControl,
        settingsBtn,
    );
    pageHeader.append(titleBlock, searchWrapper, controlsRight);

    const listContainer = h("div", { className: "flex flex-wrap -m-2.5 sm:-m-3 relative z-0" });

    let draggedCard: HTMLElement | null = null;
    let initialNextSibling: Element | null = null;

    listContainer.addEventListener("mousedown", (e: MouseEvent) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
        if (!card || card.parentElement !== listContainer) return;

        const isControl = (e.target as HTMLElement).closest("button, a, input, .card-actions");
        card.draggable = isCustomSortActive() && !isControl;
    });

    listContainer.addEventListener("dragstart", (e: DragEvent) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
        if (!card || card.parentElement !== listContainer || !card.draggable) {
            e.preventDefault();
            return;
        }

        draggedCard = card;
        initialNextSibling = card.nextElementSibling;
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";

        requestAnimationFrame(() => card.classList.add("opacity-30"));
    });

    listContainer.addEventListener("dragover", (e: DragEvent) => {
        if (!draggedCard) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

        const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-id]");
        if (!target || target === draggedCard || target.parentElement !== listContainer) return;
        if (target.getAnimations().length > 0) return;

        const isAfter = Boolean(draggedCard.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
        const prevRects = new Map([...listContainer.children].map((c) => [c, c.getBoundingClientRect()]));

        target[isAfter ? "after" : "before"](draggedCard);

        for (const [el, prev] of prevRects) {
            if (el === draggedCard) continue;
            const next = el.getBoundingClientRect();
            const dx = prev.x - next.x;
            const dy = prev.y - next.y;
            if (dx || dy) {
                el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
                    duration: 180,
                    easing: "ease-out",
                });
            }
        }
    });

    listContainer.addEventListener("dragend", (e: DragEvent) => {
        if (!draggedCard) return;
        draggedCard.classList.remove("opacity-30");
        draggedCard.draggable = false;

        if (e.dataTransfer?.dropEffect === "none") {
            if (initialNextSibling) initialNextSibling.before(draggedCard);
            else listContainer.append(draggedCard);
        } else {
            const ids = [...listContainer.children]
                .map((el) => (el as HTMLElement).dataset.id)
                .filter((id): id is string => Boolean(id));

            saveMangaOrder(ids);
        }

        draggedCard = null;
        initialNextSibling = null;
    });

    mangaSearchInput = searchInput;
    addMangaButton = addBtn;
    mangaSelectButton = selectBtn;
    selectionActionsElement = selectionActionsContainer;
    mangaListElement = listContainer;

    homepageContainer.replaceChildren(pageHeader, listContainer);
}

function createEmptyStateMessage({ title, body }: { body: string; title: string }): HTMLDivElement {
    return h(
        "div",
        {
            className:
                "w-full py-24 px-4 flex flex-col items-center justify-center rounded-3xl border border-dashed border-line mt-6 max-w-2xl mx-auto",
        },
        h(
            "div",
            { className: "w-14 h-14 rounded-full surface flex items-center justify-center mb-5 text-muted" },
            iconSvg("Library", { size: 24, strokeWidth: 1.5 }),
        ),
        h("h2", { className: "font-serif text-2xl font-medium text-ink dark:text-paper text-center mb-2" }, title),
        h("p", { className: "text-sm text-muted text-center" }, body),
    );
}

function getSearchQuery(): string {
    return mangaSearchInput?.value.trim().toLowerCase() ?? "";
}

function renderMangaList(mangaArray: Manga[]): void {
    const mangaList = mangaListElement;
    if (!mangaList) return;

    if (mangaArray.length === 0) {
        const isEmptyLibrary = getMangaList().length === 0;
        mangaList.replaceChildren(
            createEmptyStateMessage(
                isEmptyLibrary
                    ? { body: "Add a manga to start building your library.", title: "Your shelf is empty" }
                    : { body: "Try a different search.", title: "No results found" },
            ),
        );
    } else {
        const entries = mangaArray.map((manga) => {
            const cached = cardCache.get(manga.id);
            if (cached?.manga === manga) return cached;

            const cardWrapper = createMangaCardElement(manga, {
                onClick: handleCardClick,
                onDelete: (mangaId) => confirmAndDelete([mangaId]),
                onEdit: openMangaModal,
            });
            const entry: CardEntry = { cardWrapper, manga };
            cardCache.set(manga.id, entry);
            return entry;
        });

        mangaList.replaceChildren(...entries.map((entry) => entry.cardWrapper));
        entries.forEach((entry) => syncCardSelectionState($(".manga-card", entry.cardWrapper)));
    }

    updateSelectionUI();
}

function updateSelectionUIState(): void {
    updateSelectionUI();
    syncAllCardsSelectionState();
}

export function initHomePageUI(): void {
    PersistState.onChange("mangaList", (nextList) => {
        const nextIds = new Set(nextList.map((manga) => manga.id));
        for (const id of cardCache.keys()) if (!nextIds.has(id)) cardCache.delete(id);
        applyFiltersAndSorting();
    });
    PersistState.onChange("mangaSortOrder", applyFiltersAndSorting);
    UIState.onChange("isSelectEnabled", updateSelectionUIState);
    UIState.onChange("selectedMangaIds", updateSelectionUIState);

    renderHomepageStructure();
    applyFiltersAndSorting();
}

const MANGA_SORTERS: Record<Exclude<MangaSortOrder, "custom">, (a: Manga, b: Manga) => number> = {
    "chapters-asc": (a, b) => a.totalChapters - b.totalChapters,
    "chapters-desc": (a, b) => b.totalChapters - a.totalChapters,
    "title-asc": (a, b) => a.title.localeCompare(b.title),
    "title-desc": (a, b) => b.title.localeCompare(a.title),
};

function applyFiltersAndSorting(): void {
    let mangaToRender = getMangaList();

    const query = getSearchQuery();
    if (query) {
        mangaToRender = mangaToRender.filter((manga) => manga.title.toLowerCase().includes(query));
    }

    const sortOption = PersistState.mangaSortOrder;
    if (sortOption !== "custom") {
        mangaToRender = mangaToRender.toSorted(MANGA_SORTERS[sortOption]);
    }

    renderMangaList(mangaToRender);
}
