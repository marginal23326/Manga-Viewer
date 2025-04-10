import { AppState } from '../core/AppState';
import Config from '../core/Config';
import { DOM, $, $$, setAttribute, addClass, toggleClass } from '../core/DOMUtils';
import { openSettings } from './SettingsManager';
import { returnToHome } from '../ui/ViewerUI';
import { zoomIn, zoomOut, resetZoom } from './ZoomManager';
import { jumpToChapter } from './ChapterManager';

let sidebarElement = null;
let sidebarContentElement = null;
let hoverTimeout = null;

function setSidebarState(element, stateName, isOpen) {
    if (!element) return;
    if (isOpen) {
        element.setAttribute(`data-${stateName}`, 'open');
    } else {
        element.removeAttribute(`data-${stateName}`);
    }
}

export function toggleSidebarState() {
    if (!sidebarElement || !DOM.mainContent) return;
    const currentState = sidebarElement.dataset.state === 'open';
    setSidebarState(sidebarElement, 'state', !currentState);
    setSidebarState(DOM.mainContent, 'sidebar-state', !currentState);

    // If toggling closed, also ensure hover state is removed
    if (!currentState) {
        setSidebarHoverState(false);
    }
}

function setSidebarHoverState(isOpen) {
    if (!sidebarElement || !DOM.mainContent) return;
    // Skip if trying to open when sidebar is already fully open
    if (isOpen && sidebarElement.dataset.state === 'open') return;

    setSidebarState(sidebarElement, 'hover-state', isOpen);
    setSidebarState(DOM.mainContent, 'sidebar-hover-state', isOpen);
}

function createSidebarButton(id, iconName, label, tooltip, clickHandler, viewerOnly = false) {
    const button = document.createElement('button');
    addClass(button, 'btn-icon w-full flex items-center justify-start px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700');
    if (id) button.id = id;
    setAttribute(button, 'aria-label', tooltip || label);
    setAttribute(button, 'title', tooltip || label); // Basic tooltip

    // Icon placeholder
    const icon = document.createElement('i');
    setAttribute(icon, 'data-lucide', iconName);
    setAttribute(icon, 'width', '24'); // Slightly larger icons for sidebar
    setAttribute(icon, 'height', '24');
    setAttribute(icon, 'stroke-width', '2');
    addClass(icon, 'flex-shrink-0'); // Prevent icon shrinking

    // Label (always visible when sidebar is open)
    const labelSpan = document.createElement('span');
    addClass(labelSpan, 'ml-4 inline whitespace-nowrap'); // Changed from hidden group-hover:inline...
    labelSpan.textContent = label;

    button.appendChild(icon);
    button.appendChild(labelSpan);

    if (clickHandler) {
        button.addEventListener('click', (event) => {
                clickHandler();
            event.currentTarget.blur();
        });
    }

    // Add data attribute to mark viewer-only buttons
    if (viewerOnly) {
        setAttribute(button, 'data-viewer-only', 'true');
    }

    return button;
}

// Function to create the zoom controls group
function createZoomControls() {
    const container = document.createElement('div');
    addClass(container, 'flex flex-col items-stretch w-full');
    setAttribute(container, 'data-viewer-only', 'true'); // Hide group on homepage

    // Zoom Level Display (Placeholder)
    const zoomLevelDisplay = document.createElement('div');
    zoomLevelDisplay.id = 'zoom-level-display';
    addClass(zoomLevelDisplay, 'text-xs text-center text-gray-500 dark:text-gray-400 my-1 block');
    zoomLevelDisplay.textContent = 'Zoom: 100%'; // Initial value

    // Zoom Buttons Container
    const buttonsContainer = document.createElement('div');
    // Stack vertically
    addClass(buttonsContainer, 'flex flex-col items-center justify-center w-full px-2');

    const zoomInBtn = createSidebarButton('zoom-in-button', 'zoom-in', 'Zoom In', 'Zoom In (+)', zoomIn);
    const zoomOutBtn = createSidebarButton('zoom-out-button', 'zoom-out', 'Zoom Out', 'Zoom Out (-)', zoomOut);
    const zoomResetBtn = createSidebarButton('zoom-reset-button', 'undo-2', 'Reset Zoom', 'Reset Zoom (=)', resetZoom);

    // Adjust button styles for layout within expanded sidebar
    [zoomInBtn, zoomOutBtn, zoomResetBtn].forEach(btn =>
        addClass(btn, 'flex-1 rounded-md')
    );

    buttonsContainer.appendChild(zoomInBtn);
    buttonsContainer.appendChild(zoomOutBtn);
    buttonsContainer.appendChild(zoomResetBtn);

    container.appendChild(zoomLevelDisplay);
    container.appendChild(buttonsContainer);

    return container;
}

// Function to create the chapter selector dropdown
function createChapterSelector() {
    const select = document.createElement('select');
    select.id = 'chapter-selector';
    addClass(select, 'ml-2 mr-2 my-2 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-sm focus:ring-blue-500 focus:border-blue-500 hidden');
    setAttribute(select, 'aria-label', 'Select Chapter');
    setAttribute(select, 'data-viewer-only', 'true'); // Hide on homepage

    // Options will be populated by ChapterManager
    select.innerHTML = '<option>Chapter</option>'; // Placeholder

    // Handler for chapter change
    select.addEventListener('change', (event) => {
        jumpToChapter(event);
        event.target.blur();
    });

    return select;
}

// Update visibility of viewer-only controls
export function updateSidebarViewerControls(showViewerControls) {
    if (!sidebarElement) {
        console.warn("updateSidebarViewerControls called before sidebarElement is ready.");
        return;
    }
    const viewerOnlyElements = $$('[data-viewer-only="true"]', sidebarElement); // Use $$
    viewerOnlyElements?.forEach(el => {
        toggleClass(el, 'hidden', !showViewerControls); // Simpler toggle
    });
}

const createDivider = (viewerOnly = false) => {
    const divider = document.createElement('hr');
    addClass(divider, 'w-full border-gray-200 dark:border-gray-600 my-2');
    if (viewerOnly) setAttribute(divider, 'data-viewer-only', 'true');
    return divider;
};

export function initSidebar() {
    sidebarElement = DOM.sidebar;
    if (!sidebarElement) {
        console.error("Sidebar element (#sidebar) not found!");
        return;
    }

    // Create main content container
    sidebarElement.innerHTML = ''; // Clear existing content
    sidebarContentElement = document.createElement('div');
    addClass(sidebarContentElement, 'flex flex-col items-stretch w-full space-y-2 flex-grow');

    // Build sidebar content
    const elements = [
        createSidebarButton('return-to-home', 'home', 'Home', 'Return to Home (Esc)', returnToHome, true),
        createDivider(true),
        createZoomControls(),
        createChapterSelector(),
        createDivider(),
        createSidebarButton('settings-button', 'settings', 'Settings', 'Open Settings (Shift+S)', openSettings)
    ];

    // Append all elements
    sidebarContentElement.append(...elements.slice(0, -1)); // All except settings
    sidebarElement.append(sidebarContentElement, elements[elements.length - 1]); // Content and settings

    // Initialize states and events
    updateSidebarViewerControls(AppState.currentView === 'viewer');
    
    const selector = $('#chapter-selector', sidebarElement);
    if (selector) {
        document.addEventListener('click', e => !selector.contains(e.target) && selector.blur());
    }
    initSidebarInteraction();
}

// Function to update the zoom level display (called by ZoomManager)
export function updateZoomLevelDisplay(zoomLevel) {
    if (!sidebarElement) return;
    const display = $('#zoom-level-display', sidebarElement);
    if (display) {
        display.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
    }
}

// Function to update the chapter selector options (called by ChapterManager)
export function updateChapterSelectorOptions(totalChapters, currentChapter) {
    if (!sidebarElement) {
        setTimeout(() => updateChapterSelectorOptions(totalChapters, currentChapter), 100);
        return;
    }
     const selector = $('#chapter-selector', sidebarElement);
     if (selector) {
         selector.innerHTML = ''; // Clear existing options
         if (totalChapters > 0) {
             for (let i = 0; i < totalChapters; i++) {
                 const option = document.createElement('option');
                 option.value = i;
                 option.textContent = `Chapter ${i + 1}`; // Display 1-based chapter number
                 if (i === currentChapter) {
                     option.selected = true;
                 }
                 selector.appendChild(option);
             }
             selector.disabled = false;
         } else {
             selector.innerHTML = '<option>N/A</option>';
             selector.disabled = true;
         }
     }
}

function initSidebarInteraction() {
    if (!sidebarElement) return;

    const handleMousePosition = (event) => {
        const isNearEdge = event.clientX < Config.SIDEBAR_HOVER_SENSITIVITY;
        const isOverSidebar = sidebarElement.contains(event.target);

        clearTimeout(hoverTimeout);

        if (isNearEdge && !isOverSidebar) {
            hoverTimeout = setTimeout(() => setSidebarHoverState(true), Config.SIDEBAR_HOVER_DELAY);
        } else if (!isNearEdge && !isOverSidebar) {
            setSidebarHoverState(false);
        }
    };

    document.addEventListener('mousemove', handleMousePosition);
    sidebarElement.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimeout);
        setSidebarHoverState(false);
    });
}