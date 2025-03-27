import { AppState } from '../core/AppState';
import { DOM, $, $$, setHtml, addClass, removeClass, setText, setAttribute, getDataAttribute } from '../core/DOMUtils';
import { createMangaCardElement } from '../components/MangaCard';
import { openMangaModal, deleteManga, loadMangaForViewing, saveMangaOrder } from '../features/MangaManager';
import Sortable from 'sortablejs';
import { createIcons, icons } from 'lucide';

let sortableInstance = null;

function renderHomepageStructure() {
    console.log("   -> renderHomepageStructure: Starting"); // Log
    const container = DOM.homepageContainer;
    if (!container) {
        console.error("   -> renderHomepageStructure: Homepage container (DOM.homepageContainer) NOT FOUND!"); // Error Log
        return;
    }
    console.log("   -> renderHomepageStructure: Found container:", container); // Log
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
    addClass(addBtn, 'btn btn-primary'); // Uses @utility btn and btn-primary
    addBtn.id = 'add-manga-btn';

    // Create a span to hold the icon and text together for flex layout
    const btnContent = document.createElement('span');
    addClass(btnContent, 'inline-flex items-center'); // Use flex to align icon and text

    // Icon placeholder
    const addIcon = document.createElement('i');
    setAttribute(addIcon, 'data-lucide', 'plus-circle');
    setAttribute(addIcon, 'class', 'mr-2'); // Add margin to the icon itself
    setAttribute(addIcon, 'width', '20');
    setAttribute(addIcon, 'height', '20');
    setAttribute(addIcon, 'stroke-width', '2'); // Ensure stroke is set

    // Text node
    const btnText = document.createTextNode('Add Manga');

    btnContent.appendChild(addIcon);
    btnContent.appendChild(btnText);
    addBtn.appendChild(btnContent); // Append the span to the button

    addBtn.addEventListener('click', () => openMangaModal());
    addBtnContainer.appendChild(addBtn);

    // --- Manga List Container ---
    const listContainer = document.createElement('div');
    addClass(listContainer, 'flex flex-wrap -m-2'); // Use -m-2 for gutters with p-2 on children
    listContainer.id = 'manga-list';
    DOM.mangaList = listContainer; // Cache the manga list container specifically

    // --- Append to Homepage Container ---
    container.appendChild(titleContainer);
    container.appendChild(addBtnContainer);
    container.appendChild(listContainer);
    console.log("   -> renderHomepageStructure: Appended static elements"); // Log

    // --- Call createIcons ---
    try {
        console.log("   -> renderHomepageStructure: Calling createIcons for static elements"); // Log
        createIcons({
            icons,
            attrs: { 'stroke-width': 2 } // Default stroke width if not specified on <i>
        });
        console.log("   -> renderHomepageStructure: createIcons for static elements finished"); // Log
    } catch (error) {
        console.error("   -> renderHomepageStructure: Error calling createIcons:", error); // Error Log
    }
     console.log("   -> renderHomepageStructure: Finished"); // Log
}

export async function renderMangaList(mangaArray) {
    console.log("   -> renderMangaList: Starting"); // Log
    if (!DOM.mangaList) {
        console.error("   -> renderMangaList: Manga list container (DOM.mangaList) NOT FOUND!"); // Error Log
        return;
    }
    DOM.mangaList.innerHTML = ''; // Clear only list

    if (!mangaArray || mangaArray.length === 0) {
        const emptyMessage = document.createElement('p');
        addClass(emptyMessage, 'text-center text-gray-500 dark:text-gray-400 w-full py-10');
        setText(emptyMessage, 'No manga added yet. Click "Add Manga" to get started!');
        DOM.mangaList.appendChild(emptyMessage);
        console.log("   -> renderMangaList: Rendered empty message"); // Log
        return; // Exit early if no manga
    }

    console.log(`   -> renderMangaList: Creating ${mangaArray.length} manga card elements...`); // Log
    const cardPromises = mangaArray.map(manga =>
        createMangaCardElement(manga, {
            onClick: loadMangaForViewing,
            onEdit: openMangaModal,
            onDelete: deleteManga
        })
    );
    const cardElements = await Promise.all(cardPromises);
    console.log("   -> renderMangaList: Finished creating card elements"); // Log

    const fragment = document.createDocumentFragment();
    cardElements.forEach(cardElement => {
        if (cardElement) {
            fragment.appendChild(cardElement);
        }
    });
    DOM.mangaList.appendChild(fragment);
    console.log("   -> renderMangaList: Appended card elements to DOM"); // Log

    // --- Call createIcons for dynamic card content ---
    try {
        console.log("   -> renderMangaList: Calling createIcons for dynamic card elements"); // Log
        createIcons({
             icons,
             attrs: { 'stroke-width': 2 } // Default stroke width
         });
        console.log("   -> renderMangaList: createIcons for dynamic elements finished"); // Log
    } catch (error) {
        console.error("   -> renderMangaList: Error calling createIcons for cards:", error); // Error Log
    }

    initSortable();
    console.log("   -> renderMangaList: Finished"); // Log
}

function initSortable() {
    // ... (SortableJS init code remains the same) ...
    if (!DOM.mangaList) return;
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(/* ... */);
    console.log("   -> initSortable: Initialized"); // Log
}

export function initHomePageUI() {
    console.log(" -> initHomePageUI: Starting"); // Log
    renderHomepageStructure();
    renderMangaList(AppState.mangaList);
    console.log(" -> initHomePageUI: Finished"); // Log
}