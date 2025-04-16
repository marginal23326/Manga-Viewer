import { DOM, $, $$, addClass, toggleClass, setHtml, setText, setAttribute } from '../core/DOMUtils';
import { renderIcons } from '../core/icons';

const activeModals = new Map();

/**
 * Creates and shows a modal dialog.
 * @param {string} id - A unique ID for the modal.
 * @param {object} options - Configuration options.
 * @param {string} options.title - The title for the modal header.
 * @param {string | HTMLElement} options.content - HTML string or HTMLElement for the modal body.
 * @param {string} [options.size='md'] - Size variant ('sm', 'md', 'lg', 'xl', '2xl').
 * @param {Array<object>} [options.buttons] - Array of button objects for the footer. Types: 'primary', 'secondary', 'danger'.
 * @param {boolean} [options.closeOnBackdropClick=true] - Whether clicking the backdrop closes the modal.
 * @param {boolean} [options.closeOnEscape=true] - Whether pressing Escape closes the modal.
 * @param {boolean} [options.showCloseButton=true] - Whether to show the 'X' close button in the header.
 * @param {Function} [options.onClose] - Callback function when the modal is closed.
 */
export function showModal(id, options = {}) {
    // Default options
    const config = {
        title: 'Modal Title',
        content: '<p>Modal Content</p>',
        size: 'md',
        buttons: [{ text: 'Close', type: 'secondary', onClick: () => hideModal(id) }],
        closeOnBackdropClick: true,
        closeOnEscape: true,
        showCloseButton: true,
        onClose: null,
        ...options
    };

    hideModal(id); // Remove existing modal with the same ID

    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = id;
    addClass(modalBackdrop, 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0');
    setAttribute(modalBackdrop, 'role', 'dialog');

    const modalDialog = document.createElement('div');
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl' };
    addClass(modalDialog, `bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[config.size] || sizeClasses.md} flex flex-col max-h-[90vh] transform scale-95 transition-all duration-300`);
    modalDialog.addEventListener('click', (e) => e.stopPropagation());

    const modalHeader = document.createElement('div');
    addClass(modalHeader, 'flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700');

    const modalTitle = document.createElement('h2');
    modalTitle.id = `${id}-title`;
    addClass(modalTitle, 'text-lg font-semibold text-gray-900 dark:text-gray-100');
    setText(modalTitle, config.title);
    modalHeader.appendChild(modalTitle);

    let closeButton = null;
    if (config.showCloseButton) {
        closeButton = document.createElement('button');
        addClass(closeButton, 'btn-icon text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300');
        const closeIcon = document.createElement('i');
        setAttribute(closeIcon, 'data-lucide', 'x');
        closeButton.appendChild(closeIcon);
        closeButton.addEventListener('click', () => hideModal(id));
        modalHeader.appendChild(closeButton);
    }

    const modalBody = document.createElement('div');
    addClass(modalBody, 'p-4 overflow-y-auto');
    if (typeof config.content === 'string') {
        setHtml(modalBody, config.content);
    } else if (config.content instanceof HTMLElement) {
        modalBody.appendChild(config.content);
    }

    const modalFooter = document.createElement('div');
    addClass(modalFooter, 'flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700 space-x-2');
    config.buttons.forEach(btnConfig => {
        const button = document.createElement('button');
        const typeClass = `btn-${btnConfig.type || 'secondary'}`;
        addClass(button, `btn ${typeClass}`);
        if (btnConfig.id) button.id = btnConfig.id;
        setText(button, btnConfig.text);
        if (btnConfig.onClick && typeof btnConfig.onClick === 'function') {
            button.addEventListener('click', btnConfig.onClick);
        }
        modalFooter.appendChild(button);
    });

    modalDialog.appendChild(modalHeader);
    modalDialog.appendChild(modalBody);
    if (config.buttons && config.buttons.length > 0) {
        modalDialog.appendChild(modalFooter);
    }
    modalBackdrop.appendChild(modalDialog);
    DOM.modalContainer?.appendChild(modalBackdrop);
    renderIcons();

    requestAnimationFrame(() => {
        toggleClass(modalBackdrop, 'opacity-100', true);
        toggleClass(modalDialog, 'scale-100', true);
    });

    let escapeHandler = null;
    if (config.closeOnEscape) {
        escapeHandler = (event) => {
            if (event.key === 'Escape') {
                hideModal(id);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    let backdropClickHandler = null;
    if (config.closeOnBackdropClick) {
        backdropClickHandler = () => hideModal(id);
        modalBackdrop.addEventListener('click', backdropClickHandler);
    }

    activeModals.set(id, {
        element: modalBackdrop,
        escHandler: escapeHandler,
        backdropHandler: backdropClickHandler,
        onClose: config.onClose
    });
}

/**
 * @param {string} id - The ID of the modal to hide.
 */
export function hideModal(id) {
    const modalInfo = activeModals.get(id);
    if (!modalInfo) return;

    const { element: modalBackdrop, escHandler, backdropHandler, onClose } = modalInfo;
    const modalDialog = modalBackdrop.querySelector(':scope > div');

    toggleClass(modalBackdrop, 'opacity-100', false);
    if (modalDialog) toggleClass(modalDialog, 'scale-100', false);

    modalBackdrop.addEventListener('transitionend', () => {
        if (escHandler) {
            document.removeEventListener('keydown', escHandler);
        }
        if (backdropHandler) {
            modalBackdrop.removeEventListener('click', backdropHandler);
        }
        modalBackdrop.remove();
        if (onClose && typeof onClose === 'function') {
            try {
                onClose();
            } catch (e) {
                console.error(`Error in modal onClose callback for ID "${id}":`, e);
            }
        }
        activeModals.delete(id);
    }, { once: true });
}