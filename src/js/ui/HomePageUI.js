import { AppState } from '../core/AppState';
import { DOM, $, $$, setHtml, addClass, removeClass, setText, setAttribute, getDataAttribute } from '../core/DOMUtils';
import { createMangaCardElement } from '../components/MangaCard';
import { openMangaModal, deleteManga, loadMangaForViewing, saveMangaOrder } from '../features/MangaManager';
import Sortable from 'sortablejs';
import { renderIcons } from '../core/icons';

let sortableInstance = null;

function renderHomepageStructure() {
    const container = DOM.homepageContainer;
    if (!container) return;
    container.innerHTML = ''; // Clear container

    // --- Title ---
    const titleContainer = document.createElement('div');
    addClass(titleContainer, 'text-center mb-8');
    const title = document.createElement('h1');
    addClass(title, 'text-4xl sm:text-5xl md:text-6xl font-cursive font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 inline-block py-2');
    setText(title, 'Manga Viewer');
    titleContainer.appendChild(title);

    // --- Add Button ---
    const addBtnContainer = document.createElement('div');
    addClass(addBtnContainer, 'text-center mb-8');
    const addBtn = document.createElement('button');
    addClass(addBtn, 'btn btn-primary');
    addBtn.id = 'add-manga-btn';
    const addIcon = document.createElement('i');
    setAttribute(addIcon, 'data-lucide', 'plus-circle');
    setAttribute(addIcon, 'class', 'inline-block mr-2');
    setAttribute(addIcon, 'width', '20'); setAttribute(addIcon, 'height', '20');
    addBtn.appendChild(addIcon);
    addBtn.appendChild(document.createTextNode('Add Manga'));
    addBtn.addEventListener('click', () => openMangaModal());
    addBtnContainer.appendChild(addBtn);

    // --- Manga List Container ---
    const listContainer = document.createElement('div');
    addClass(listContainer, 'flex flex-wrap -m-2');
    listContainer.id = 'manga-list';
    DOM.mangaList = listContainer;

    // --- Append to Homepage Container ---
    container.appendChild(titleContainer);
    container.appendChild(addBtnContainer);
    container.appendChild(listContainer);
}

export async function renderMangaList(mangaArray) {
    if (!DOM.mangaList) return;
    DOM.mangaList.innerHTML = ''; // Clear only list

    if (!mangaArray || mangaArray.length === 0) {
        const emptyMessage = document.createElement('p');
        addClass(emptyMessage, 'text-center text-gray-500 dark:text-gray-400 w-full py-10');
        setText(emptyMessage, 'No manga added yet. Click "Add Manga" to get started!');
        DOM.mangaList.appendChild(emptyMessage);
        return;
    }

    const cardPromises = mangaArray.map(manga =>
        createMangaCardElement(manga, {
            onClick: loadMangaForViewing,
            onEdit: openMangaModal,
            onDelete: deleteManga
        })
    );
    const cardElements = await Promise.all(cardPromises);
    const fragment = document.createDocumentFragment();
    cardElements.forEach(cardElement => {
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
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        handle: '.manga-card',
        filter: '.edit-btn, .delete-btn',
        preventOnFilter: true,
        onEnd: (evt) => {
            const newOrderIds = Array.from(evt.to.children).map(
                cardWrapper => {
                    const mangaCardElement = cardWrapper.querySelector('.manga-card');
                    return getDataAttribute(mangaCardElement, 'mangaId');
                }
            );
            saveMangaOrder(newOrderIds);
        },
    });
}

export function initHomePageUI() {
    renderHomepageStructure();
    renderMangaList(AppState.mangaList);
}