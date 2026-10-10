import { MANGA_SORT_FIELD_OPTIONS, type Manga, type MangaSortDir, type MangaSortField } from "@/types";
import { type MangaCard, createMangaCardElement } from "./manga-card";
import { PersistState, ViewerState, getManga } from "@/state";
import { confirmAndDelete, openMangaModal, saveMangaOrder } from "./manga-actions";
import { createIconButton, iconSvg, setIcon } from "@/core/icons";
import { h, setVisible } from "@/core/dom-utils";
import { bind } from "@/core/binding";
import { createSegmentedControl } from "@/components/segmented-control";
import { createState } from "@/core/create-state";
import { debounce } from "@/core/utils";
import { enableReorder } from "./reorder";
import { navigateTo } from "@/app/hash-route";
import { openSettings } from "@/settings";
import { withShortcutHint } from "@/app/keymap";

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

function compareManga(a: Manga, b: Manga, field: MangaSortField, dir: MangaSortDir): number {
    const order = field === "title" ? a.title.localeCompare(b.title) : a.totalChapters - b.totalChapters;
    return dir === "asc" ? order : -order;
}

export function createHomePage(): HTMLElement {
    const cardCache = new Map<string, MangaCard>();
    const SelectionState = createState<{ selectedMangaIds: string[] | null }>({ selectedMangaIds: null });

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

    const countText = h("p", { className: "mt-2 text-muted" });
    const addBtn = h(
        "button",
        { className: "btn-primary", onclick: () => openMangaModal() },
        iconSvg("Plus", { size: 16, strokeWidth: 2.5 }),
        "Add manga",
    );
    const settingsBtn = createIconButton("Settings", {
        iconOptions: { size: 18 },
        onClick: openSettings,
        tooltip: withShortcutHint("Settings", "openSettings"),
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

    const sortFieldControl = createSegmentedControl({
        binding: bind(PersistState, "mangaSortField"),
        items: MANGA_SORT_FIELD_OPTIONS,
    });
    const sortDirButton = createIconButton("ArrowUp", {
        iconOptions: { size: 14 },
        onClick: () => PersistState.update("mangaSortDir", PersistState.mangaSortDir === "asc" ? "desc" : "asc"),
        tooltip: "Toggle sort direction",
    });
    function syncSortDirButton(): void {
        const dir = PersistState.mangaSortDir;
        sortDirButton.disabled = PersistState.mangaSortField === "custom";
        setIcon(sortDirButton, dir === "desc" ? "ArrowDown" : "ArrowUp", { size: 14 });
    }
    PersistState.onChange(["mangaSortField", "mangaSortDir"], syncSortDirButton, { immediate: true });
    const selectBtn = h("button", { className: "btn-secondary", onclick: toggleSelection });

    const toolbar = h(
        "div",
        {
            className:
                "sticky top-0 z-20 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 bg-canvas/85 backdrop-blur-xl flex flex-wrap items-center gap-2",
        },
        searchWrapper,
        h("div", { className: "flex items-center gap-2 ml-auto" }, sortDirButton, sortFieldControl, selectBtn),
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

    enableReorder(listContainer, { canDrag: isCustomSortActive, onReorder: () => saveMangaOrder(getVisibleIds()) });

    listContainer.addEventListener("click", (event) => {
        const target = event.target as Element;
        const manga = getManga(target.closest<HTMLElement>("[data-id]")?.dataset.id);
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
        { className: "w-full px-5 sm:px-8 pb-28 max-w-7xl mx-auto", id: "homepage-container" },
        pageHeader,
        toolbar,
        listContainer,
        selectionBar,
    );

    function isCustomSortActive(): boolean {
        return (
            PersistState.mangaSortField === "custom" && SelectionState.selectedMangaIds === null && !getSearchQuery()
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
        for (const card of cardCache.values())
            card.element.toggleAttribute("data-selected", selected.has(card.manga.id));

        setVisible(selectionBar, isEnabled);
        setVisible(addBtn, !isEnabled);
        listContainer.toggleAttribute("data-selecting", isEnabled);
        selectBtn.className = isEnabled ? "btn-primary" : "btn-secondary";
        selectBtn.disabled = !isEnabled && PersistState.mangaList.length === 0;

        if (isEnabled) {
            countSpan.textContent = `${count} selected`;
            deleteBtn.disabled = count === 0;
            selectAllBtn.textContent = visibleCount > 0 && count === visibleCount ? "Clear" : "Select all";
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
        const total = PersistState.mangaList.length;
        countText.textContent =
            mangaArray.length === total ? `${total} manga` : `${mangaArray.length} of ${total} manga`;

        if (mangaArray.length === 0) {
            const query = searchInput.value.trim();
            listContainer.replaceChildren(
                createEmptyStateMessage(
                    total === 0
                        ? {
                              body: "Pick a folder that contains one subfolder per chapter.",
                              title: "Your library is empty",
                          }
                        : { body: "Check the spelling or try a shorter title.", title: `No manga match “${query}”` },
                ),
            );
        } else {
            const cards = mangaArray.map((manga) => {
                const cached = cardCache.get(manga.id);
                if (cached?.manga === manga) return cached;

                const card = createMangaCardElement(manga);
                cardCache.set(manga.id, card);
                return card;
            });

            listContainer.replaceChildren(...cards.map((card) => card.element));
        }

        updateSelectionUI();
    }

    function applyFiltersAndSorting(): void {
        let mangaToRender = PersistState.mangaList;

        const query = getSearchQuery();
        if (query) mangaToRender = mangaToRender.filter((manga) => manga.title.toLowerCase().includes(query));

        const { mangaSortDir, mangaSortField } = PersistState;
        if (mangaSortField !== "custom")
            mangaToRender = mangaToRender.toSorted((a, b) => compareManga(a, b, mangaSortField, mangaSortDir));

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
    PersistState.onChange(["mangaSortField", "mangaSortDir"], applyFiltersAndSorting);
    SelectionState.onChange("selectedMangaIds", updateSelectionUI);
    ViewerState.onChange("currentMangaId", (mangaId) => {
        setVisible(container, mangaId === null);
        if (mangaId !== null) return;
        for (const card of cardCache.values()) card.refresh();
        scrollTo(0, 0);
    });

    applyFiltersAndSorting();
    return container;
}
