import { DOM, $, $$, addClass, removeClass, setHtml, setText, setAttribute } from '../core/DOMUtils';
import { renderIcons } from '../core/icons';

// Store references to currently active modals and their close handlers
const activeModals = new Map();

/**
 * Creates and shows a modal dialog.
 * @param {string} id - A unique ID for the modal.
 * @param {object} options - Configuration options.
 * @param {string} options.title - The title for the modal header.
 * @param {string | HTMLElement} options.content - HTML string or HTMLElement for the modal body.
 * @param {string} [options.size='md'] - Size variant ('sm', 'md', 'lg', 'xl').
 * @param {Array<object>} [options.buttons] - Array of button objects for the footer (e.g., { text: 'Save', type: 'primary', id: 'save-btn', onClick: () => {} }).
 * @param {boolean} [options.closeOnBackdropClick=true] - Whether clicking the backdrop closes the modal.
 * @param {Function} [options.onClose] - Callback function when the modal is closed.
 */
export function showModal(id, options = {}) {
    // Default options
    const config = {
        title: 'Modal Title',
        content: '<p>Modal Content</p>',
        size: 'md', // sm, md, lg, xl
        buttons: [{ text: 'Close', type: 'secondary', onClick: () => hideModal(id) }],
        closeOnBackdropClick: true,
        onClose: null,
        ...options
    };

    // Remove existing modal with the same ID if present
    hideModal(id);

    // --- Create Modal Structure ---
    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = id;
    // Base backdrop styles
    addClass(modalBackdrop, 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0');
    setAttribute(modalBackdrop, 'role', 'dialog');
    setAttribute(modalBackdrop, 'aria-modal', 'true');
    setAttribute(modalBackdrop, 'aria-labelledby', `${id}-title`);

    const modalDialog = document.createElement('div');
    // Dialog container styles with size variants
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl', // Add more sizes if needed
    };
    addClass(modalDialog, `bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[config.size] || sizeClasses.md} flex flex-col max-h-[90vh] transform scale-95 transition-all duration-300`);
    // Stop propagation to prevent backdrop click when clicking dialog
    modalDialog.addEventListener('click', (e) => e.stopPropagation());

    // --- Header ---
    const modalHeader = document.createElement('div');
    addClass(modalHeader, 'flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700');

    const modalTitle = document.createElement('h2');
    modalTitle.id = `${id}-title`;
    addClass(modalTitle, 'text-lg font-semibold text-gray-900 dark:text-gray-100');
    setText(modalTitle, config.title);

    const closeButton = document.createElement('button');
    addClass(closeButton, 'btn-icon text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300');
    setAttribute(closeButton, 'aria-label', 'Close modal');
    const closeIcon = document.createElement('i');
    setAttribute(closeIcon, 'data-lucide', 'x');
    closeButton.appendChild(closeIcon);
    closeButton.addEventListener('click', () => hideModal(id));

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    // --- Body ---
    const modalBody = document.createElement('div');
    addClass(modalBody, 'p-4 overflow-y-auto'); // Allow body scrolling
    if (typeof config.content === 'string') {
        setHtml(modalBody, config.content);
    } else if (config.content instanceof HTMLElement) {
        modalBody.appendChild(config.content);
    }

    // --- Footer ---
    const modalFooter = document.createElement('div');
    addClass(modalFooter, 'flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700 space-x-2');

    // Add buttons
    config.buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        const typeClass = `btn-${btnConfig.type || 'secondary'}`; // Default to secondary
        addClass(button, `btn ${typeClass}`);
        if (btnConfig.id) button.id = btnConfig.id;
        setText(button, btnConfig.text);
        if (btnConfig.onClick && typeof btnConfig.onClick === 'function') {
            button.addEventListener('click', btnConfig.onClick);
        }
        modalFooter.appendChild(button);
    });

    // --- Assemble Modal ---
    modalDialog.appendChild(modalHeader);
    modalDialog.appendChild(modalBody);
    if (config.buttons && config.buttons.length > 0) {
        modalDialog.appendChild(modalFooter);
    }
    modalBackdrop.appendChild(modalDialog);

    // --- Add to DOM ---
    DOM.modalContainer?.appendChild(modalBackdrop);

    renderIcons();

    // --- Show Animation ---
    // Use rAF to ensure initial styles are applied before transition starts
    requestAnimationFrame(() => {
        addClass(modalBackdrop, 'opacity-100');
        addClass(modalDialog, 'scale-100');
    });

    // --- Event Listeners ---
    const closeHandler = (event) => {
        // Close on Escape key
        if (event.key === 'Escape') {
            hideModal(id);
        }
    };
    document.addEventListener('keydown', closeHandler);

    let backdropClickHandler = null;
    if (config.closeOnBackdropClick) {
        backdropClickHandler = () => hideModal(id);
        modalBackdrop.addEventListener('click', backdropClickHandler);
    }

    // Store modal info for cleanup
    activeModals.set(id, {
        element: modalBackdrop,
        escHandler: closeHandler,
        backdropHandler: backdropClickHandler,
        onClose: config.onClose
    });
}

/**
 * Hides and removes a modal dialog.
 * @param {string} id - The ID of the modal to hide.
 */
export function hideModal(id) {
    const modalInfo = activeModals.get(id);
    if (!modalInfo) return;

    const { element: modalBackdrop, escHandler, backdropHandler, onClose } = modalInfo;
    const modalDialog = modalBackdrop.querySelector(':scope > div'); // Get the direct child dialog

    // --- Hide Animation ---
    removeClass(modalBackdrop, 'opacity-100');
    if (modalDialog) removeClass(modalDialog, 'scale-100');

    // --- Cleanup after animation ---
    modalBackdrop.addEventListener('transitionend', () => {
        // Remove event listeners
        document.removeEventListener('keydown', escHandler);
        if (backdropHandler) {
            modalBackdrop.removeEventListener('click', backdropHandler);
        }

        // Remove from DOM
        modalBackdrop.remove();

        // Call onClose callback
        if (onClose && typeof onClose === 'function') {
            try {
                onClose();
            } catch (e) {
                console.error(`Error in modal onClose callback for ID "${id}":`, e);
            }
        }

        // Remove from active modals map
        activeModals.delete(id);

    }, { once: true }); // Ensure listener runs only once
}