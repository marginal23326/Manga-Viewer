import { AppState } from '../core/AppState';
import { DOM, $, $$, setAttribute, addClass, toggleClass } from '../core/DOMUtils';
import { openSettings } from './SettingsManager';
import { returnToHome } from '../ui/ViewerUI';
import { zoomIn, zoomOut, resetZoom } from './ZoomManager';
import { jumpToChapter } from './ChapterManager';

let sidebarElement = null;
let sidebarContentElement = null; // We'll create this container

// Function to create a sidebar button
function createSidebarButton(id, iconName, label, tooltip, clickHandler, viewerOnly = false) {
    const button = document.createElement('button');
    addClass(button, 'btn-icon w-full flex items-center justify-center group-hover:justify-start group-hover:px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700');
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

    // Label (visible on hover/expanded)
    const labelSpan = document.createElement('span');
    addClass(labelSpan, 'ml-4 hidden group-hover:inline whitespace-nowrap');
    labelSpan.textContent = label;

    button.appendChild(icon);
    button.appendChild(labelSpan);

    if (clickHandler) {
        button.addEventListener('click', clickHandler);
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
    addClass(container, 'flex flex-col items-center group-hover:items-stretch w-full');
    setAttribute(container, 'data-viewer-only', 'true'); // Hide group on homepage

    // Zoom Level Display (Placeholder)
    const zoomLevelDisplay = document.createElement('div');
    zoomLevelDisplay.id = 'zoom-level-display';
    addClass(zoomLevelDisplay, 'text-xs text-center text-gray-500 dark:text-gray-400 my-1 hidden group-hover:block');
    zoomLevelDisplay.textContent = 'Zoom: 100%'; // Initial value

    // Zoom Buttons Container
    const buttonsContainer = document.createElement('div');
    // Use flex row on hover, stack vertically when collapsed
    addClass(buttonsContainer, 'flex flex-col group-hover:flex-row items-center justify-center w-full');

    const zoomInBtn = createSidebarButton('zoom-in-button', 'zoom-in', 'Zoom In', 'Zoom In (+)', zoomIn);
    const zoomOutBtn = createSidebarButton('zoom-out-button', 'zoom-out', 'Zoom Out', 'Zoom Out (-)', zoomOut);
    const zoomResetBtn = createSidebarButton('zoom-reset-button', 'undo-2', 'Reset Zoom', 'Reset Zoom (=)', resetZoom);

    // Adjust button styles for horizontal layout on hover
    addClass(zoomInBtn, 'group-hover:flex-1 group-hover:rounded-l-md group-hover:rounded-r-none');
    addClass(zoomOutBtn, 'group-hover:flex-1 group-hover:rounded-none');
    addClass(zoomResetBtn, 'group-hover:flex-1 group-hover:rounded-r-md group-hover:rounded-l-none');

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
    addClass(select, 'w-full my-2 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-sm focus:ring-blue-500 focus:border-blue-500 hidden group-hover:block'); // Only show on hover/expand
    setAttribute(select, 'aria-label', 'Select Chapter');
    setAttribute(select, 'data-viewer-only', 'true'); // Hide on homepage

    // Options will be populated by ChapterManager
    select.innerHTML = '<option>Chapter</option>'; // Placeholder

    select.addEventListener('change', jumpToChapter); // From ChapterManager

    // Add focus/blur handling if needed for sidebar expansion persistence
    // select.addEventListener('focus', () => AppState.update('isChapterSelectorOpen', true));
    // select.addEventListener('blur', () => AppState.update('isChapterSelectorOpen', false));

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


export function initSidebar() {
    if (!DOM.sidebar) {
         console.error("Sidebar element (#sidebar) not found in cached DOM!");
         return;
    }
    sidebarElement = DOM.sidebar;
    if (!sidebarElement) {
        console.error("Sidebar element not found!");
        return;
    }

    // Clear any existing content (like placeholders)
    sidebarElement.innerHTML = '';

    // Create main content container within the sidebar
    sidebarContentElement = document.createElement('div');
    addClass(sidebarContentElement, 'flex flex-col items-center w-full space-y-2 flex-grow'); // Use space-y for spacing

    // --- Add Buttons ---
    // Home Button
    sidebarContentElement.appendChild(
        createSidebarButton('return-to-home', 'home', 'Home', 'Return to Home (Esc)', returnToHome)
    );

    // --- Viewer-Specific Controls ---
    // Add a divider (optional)
    const divider1 = document.createElement('hr');
    addClass(divider1, 'w-10/12 border-gray-200 dark:border-gray-600 my-2 group-hover:w-full');
    setAttribute(divider1, 'data-viewer-only', 'true');
    sidebarContentElement.appendChild(divider1);

    // Zoom Controls
    sidebarContentElement.appendChild(createZoomControls());

    // Chapter Selector
    sidebarContentElement.appendChild(createChapterSelector());

    // Add another divider (optional)
    const divider2 = document.createElement('hr');
    addClass(divider2, 'w-10/12 border-gray-200 dark:border-gray-600 my-2 group-hover:w-full');
    sidebarContentElement.appendChild(divider2);

    // --- Settings Button (Always Visible) ---
    // Place settings at the bottom
    const settingsButton = createSidebarButton('settings-button', 'settings', 'Settings', 'Open Settings (Shift+S)', openSettings);


    // Append content and settings button to sidebar
    sidebarElement.appendChild(sidebarContentElement);
    sidebarElement.appendChild(settingsButton); // Settings button outside the main content flow, at the bottom

    // Set initial visibility based on current view
    updateSidebarViewerControls(AppState.currentView === 'viewer');

    console.log("Sidebar Initialized.");
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