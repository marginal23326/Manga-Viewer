import { MANGA_SORT_ORDER_OPTIONS, type Manga, type MangaSortOrder } from "@/types";
import { type MangaCard, createMangaCardElement } from "./manga-card";
import { PersistState, getMangaList } from "@/state";
import { confirmAndDelete, openMangaModal, saveMangaOrder } from "./manga-actions";
import { createIconButton, iconSvg } from "@/core/icons";
import { h, setText, setVisible, toggleClass } from "@/core/dom-utils";
import { createSelect } from "@/components/custom-select";
import { createState } from "@/core/create-state";
import { debounce } from "@/core/utils";
import { navigateTo } from "@/app/hash-route";
import { openSettings } from "@/settings";

interface CardEntry {
    card: MangaCard;
    manga: Manga;
}

const cardCache = new Map<string, CardEntry>();

const SelectionState = createState<{ selectedMangaIds: string[] | null }>({ selectedMangaIds: null });

export function refreshLibraryCovers(): void {
    for (const { card } of cardCache.values()) {
        card.refreshCover();
        card.refreshProgress();
    }
}

function createEmptyStateMessage({ body, title }: { body: string; title: string }): HTMLDivElement {
    return h(
        "div",
        { className: "col-span-full py-28 px-4 flex flex-col items-center text-center" },
        h(
            "div",
            { className: "w-12 h-12 rounded-xl surface flex items-center justify-center mb-5 text-muted" },
            iconSvg("BookOpen", { size: 22, strokeWidth: 1.5 }),
        ),
        h("h2", { className: "text-xl font-semibold tracking-tight mb-1.5" }, title),
        h("p", { className: "text-muted max-w-xs" }, body),
    );
}

function createAddButton(): HTMLButtonElement {
    return h(
        "button",
        { className: "btn-primary", onclick: () => openMangaModal() },
        iconSvg("Plus", { size: 16, strokeWidth: 2.5 }),
        "Add manga",
    );
}

const MANGA_SORTERS: Record<Exclude<MangaSortOrder, "custom">, (a: Manga, b: Manga) => number> = {
    "chapters-asc": (a, b) => a.totalChapters - b.totalChapters,
    "chapters-desc": (a, b) => b.totalChapters - a.totalChapters,
    "title-asc": (a, b) => a.title.localeCompare(b.title),
    "title-desc": (a, b) => b.title.localeCompare(a.title),
};

function toggleSelection(): void {
    SelectionState.update("selectedMangaIds", SelectionState.selectedMangaIds === null ? [] : null);
}

function handleCardClick(mangaId: string): void {
    const selected = SelectionState.selectedMangaIds;
    if (selected === null) {
        navigateTo({ id: mangaId, name: "manga" });
        return;
    }
    const next = selected.includes(mangaId) ? selected.filter((id) => id !== mangaId) : [...selected, mangaId];
    SelectionState.update("selectedMangaIds", next);
}

export function createHomePage(): HTMLElement {
    const countText = h("p", { className: "mt-2 text-muted" });
    const addBtn = createAddButton();
    const settingsBtn = createIconButton("Settings", {
        className: "btn-icon",
        iconOptions: { size: 18 },
        onClick: openSettings,
        tooltip: "Settings (Shift+S)",
    });
    const pageHeader = h(
        "header",
        { className: "flex items-end justify-between gap-4 pt-5 sm:pt-8 pb-4" },
        h(
            "div",
            {},
            h(
                "h1",
                { className: "text-[32px] sm:text-[38px] font-semibold tracking-[-0.03em] leading-none" },
                "Library",
            ),
            countText,
        ),
        h("div", { className: "flex items-center gap-1.5" }, settingsBtn, addBtn),
    );

    const searchInput = h("input", {
        "aria-label": "Search library",
        className: "input-field pl-10 pr-4",
        oninput: debounce(() => applyFiltersAndSorting()),
        placeholder: "Search by title",
        type: "search",
    });
    const searchWrapper = h(
        "div",
        { className: "relative flex-1 min-w-48 max-w-md" },
        h(
            "div",
            { className: "absolute left-3.5 inset-y-0 flex items-center text-faint pointer-events-none" },
            iconSvg("Search", { size: 16 }),
        ),
        searchInput,
    );

    const customSortSelect = createSelect<MangaSortOrder>({
        items: MANGA_SORT_ORDER_OPTIONS,
        onChange: (newValue) => PersistState.update("mangaSortOrder", newValue),
        value: PersistState.mangaSortOrder,
        width: "w-48",
    });
    const selectBtn = h("button", { className: "btn-secondary", onclick: toggleSelection });

    const toolbar = h(
        "div",
        {
            className:
                "sticky top-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-paper/85 dark:bg-ink/85 backdrop-blur-xl flex flex-wrap items-center gap-2",
        },
        searchWrapper,
        h("div", { className: "flex items-center gap-2 ml-auto" }, customSortSelect.element, selectBtn),
    );

    const countSpan = h("span", { className: "px-2 font-medium whitespace-nowrap" }, "0 selected");
    const selectAllBtn = h("button", { className: "btn-secondary btn-sm", onclick: toggleSelectAll }, "Select all");
    const deleteBtn = h(
        "button",
        { className: "btn-danger btn-sm", onclick: () => confirmAndDelete(SelectionState.selectedMangaIds ?? []) },
        iconSvg("Trash2", { size: 14 }),
        "Delete",
    );
    const selectionBar = h(
        "div",
        {
            className:
                "fixed bottom-6 left-1/2 -translate-x-1/2 z-30 panel rounded-2xl flex items-center gap-1.5 p-1.5",
            hidden: true,
        },
        countSpan,
        selectAllBtn,
        deleteBtn,
    );

    const listContainer = h("div", { className: "manga-grid pt-4 relative z-0" });

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
            saveMangaOrder(getVisibleIds());
        }

        draggedCard = null;
        initialNextSibling = null;
    });

    listContainer.addEventListener("click", (event) => {
        const target = event.target as Element;
        const id = target.closest<HTMLElement>("[data-id]")?.dataset.id;
        const manga = getMangaList().find((candidate) => candidate.id === id);
        if (!manga) return;

        const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
        if (action === "edit") openMangaModal(manga);
        else if (action === "delete") confirmAndDelete([manga.id]);
        else handleCardClick(manga.id);
    });

    listContainer.addEventListener("keydown", (event) => {
        const card = event.target as HTMLElement;
        if ((event.key !== "Enter" && event.key !== " ") || !card.matches(".manga-card")) return;
        event.preventDefault();
        card.click();
    });

    const container = h(
        "div",
        { className: "w-full px-5 sm:px-8 pb-28 max-w-7xl mx-auto", hidden: true, id: "homepage-container" },
        pageHeader,
        toolbar,
        listContainer,
        selectionBar,
    );

    function isCustomSortActive(): boolean {
        return (
            PersistState.mangaSortOrder === "custom" && SelectionState.selectedMangaIds === null && !getSearchQuery()
        );
    }

    function getVisibleIds(): string[] {
        return [...listContainer.children].flatMap((el) => (el as HTMLElement).dataset.id ?? []);
    }

    function updateSelectionUI(): void {
        const { selectedMangaIds } = SelectionState;
        const isEnabled = selectedMangaIds !== null;
        const count = selectedMangaIds?.length ?? 0;
        const visibleCount = getVisibleIds().length;

        const selected = new Set(selectedMangaIds);
        for (const { card, manga } of cardCache.values())
            card.element.toggleAttribute("data-selected", selected.has(manga.id));

        setVisible(selectionBar, isEnabled);
        setVisible(addBtn, !isEnabled);
        listContainer.toggleAttribute("data-selecting", isEnabled);
        toggleClass(selectBtn, "btn-primary", isEnabled);
        toggleClass(selectBtn, "btn-secondary", !isEnabled);
        selectBtn.disabled = !isEnabled && getMangaList().length === 0;

        if (isEnabled) {
            setText(countSpan, `${count} selected`);
            deleteBtn.disabled = count === 0;
            setText(selectAllBtn, visibleCount > 0 && count === visibleCount ? "Clear" : "Select all");
            selectBtn.replaceChildren(iconSvg("Check", { size: 15, strokeWidth: 2.5 }), "Done");
        } else {
            selectBtn.replaceChildren(iconSvg("ListChecks", { size: 16 }), "Select");
        }
    }

    function toggleSelectAll(): void {
        const ids = getVisibleIds();
        const allSelected = ids.length > 0 && ids.every((id) => SelectionState.selectedMangaIds?.includes(id));
        SelectionState.update("selectedMangaIds", allSelected ? [] : ids);
    }

    function getSearchQuery(): string {
        return searchInput.value.trim().toLowerCase();
    }

    function renderMangaList(mangaArray: Manga[]): void {
        const total = getMangaList().length;
        setText(countText, mangaArray.length === total ? `${total} manga` : `${mangaArray.length} of ${total} manga`);

        if (mangaArray.length === 0) {
            const query = searchInput.value.trim();
            listContainer.replaceChildren(
                total === 0
                    ? createEmptyStateMessage({
                          body: "Pick a folder that contains one subfolder per chapter.",
                          title: "Your library is empty",
                      })
                    : createEmptyStateMessage({
                          body: "Check the spelling or try a shorter title.",
                          title: `No manga match “${query}”`,
                      }),
            );
        } else {
            const entries = mangaArray.map((manga) => {
                const cached = cardCache.get(manga.id);
                if (cached?.manga === manga) return cached;

                const entry: CardEntry = { card: createMangaCardElement(manga), manga };
                cardCache.set(manga.id, entry);
                return entry;
            });

            listContainer.replaceChildren(...entries.map((entry) => entry.card.element));
        }

        updateSelectionUI();
    }

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

    PersistState.onChange("mangaList", (nextList) => {
        const nextIds = new Set(nextList.map((manga) => manga.id));
        for (const id of cardCache.keys()) if (!nextIds.has(id)) cardCache.delete(id);
        const current = SelectionState.selectedMangaIds;
        if (current !== null && current.some((id) => !nextIds.has(id))) {
            const pruned = current.filter((id) => nextIds.has(id));
            SelectionState.update("selectedMangaIds", pruned.length > 0 ? pruned : null);
        }
        applyFiltersAndSorting();
    });
    PersistState.onChange("mangaSortOrder", applyFiltersAndSorting);
    SelectionState.onChange("selectedMangaIds", updateSelectionUI);

    applyFiltersAndSorting();
    return container;
}
