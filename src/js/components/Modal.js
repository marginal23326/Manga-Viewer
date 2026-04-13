import { DOM, $, toggleClass, setHtml, h } from "../core/DOMUtils";
import { renderIcons } from "../core/icons";

const activeModals = new Map();

const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
};

/**
 * Creates and shows a brutalist modal dialog.
 * @param {string} id - A unique ID for the modal.
 * @param {object} options - Configuration options.
 */
export function showModal(id, options = {}) {
    if ($(`.modal-backdrop#${id}`)) {
        return;
    }

    const config = {
        title: "SYSTEM ALERT",
        content: "<p>NO DATA.</p>",
        size: "md",
        buttons: [{ text: "ACKNOWLEDGE", type: "secondary", onClick: () => hideModal(id) }],
        closeOnBackdropClick: true,
        closeOnEscape: true,
        showCloseButton: true,
        onClose: null,
        ...options,
    };

    // --- Backdrop ---
    const modalBackdrop = h("div", {
        id,
        className:
            "modal-backdrop fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0 z-[100]",
        style: { zIndex: `${100 + activeModals.size}` },
        role: "dialog",
    });

    // --- Dialog Container ---
    const modalDialog = h("div", {
        className: `bg-[#f4f4f0] dark:bg-[#0a0a0a] border-4 border-black dark:border-white shadow-[12px_12px_0_0_#FF3366] w-full ${sizeClasses[config.size] || sizeClasses.md} flex flex-col max-h-[90vh] transform scale-95 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-none relative`,
    });
    modalDialog.addEventListener("click", (e) => e.stopPropagation());

    // --- Header ---
    const modalHeader = h("div", {
        className:
            "flex items-center justify-between p-4 sm:p-5 border-b-4 border-black dark:border-white bg-[#f4f4f0] dark:bg-[#0a0a0a]",
    });

    const titleWrapper = h("div", { className: "flex items-center space-x-3" });
    const titleAccent = h("div", { className: "w-4 h-4 bg-[#FF3366] brutal-border" });
    const modalTitle = h(
        "h2",
        {
            id: `${id}-title`,
            className:
                "text-2xl font-syne font-bold uppercase tracking-tight text-black dark:text-white leading-none mt-1",
        },
        config.title,
    );

    titleWrapper.appendChild(titleAccent);
    titleWrapper.appendChild(modalTitle);
    modalHeader.appendChild(titleWrapper);

    let closeButton = null;
    if (config.showCloseButton) {
        const closeIcon = h("i", { "data-lucide": "x", width: "24", height: "24", "stroke-width": "3" });
        closeButton = h(
            "button",
            {
                className:
                    "btn-icon !p-1 w-10 h-10 bg-black text-white dark:bg-white dark:text-black hover:bg-[#FF3366] hover:text-white dark:hover:bg-[#FF3366] dark:hover:text-white brutal-border brutal-shadow-sm-accent hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#fff]",
                onclick: () => hideModal(id),
            },
            closeIcon,
        );
        modalHeader.appendChild(closeButton);
    }

    // --- Body ---
    const modalBody = h("div", {
        className:
            "p-4 sm:p-6 overflow-y-auto bg-[#f4f4f0] dark:bg-[#0a0a0a] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-[#f4f4f0] dark:[&::-webkit-scrollbar-track]:bg-[#0a0a0a] [&::-webkit-scrollbar-track]:border-l-2 [&::-webkit-scrollbar-track]:border-black dark:[&::-webkit-scrollbar-track]:border-white [&::-webkit-scrollbar-thumb]:bg-black dark:[&::-webkit-scrollbar-thumb]:bg-white [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-[#f4f4f0] dark:[&::-webkit-scrollbar-thumb]:border-[#0a0a0a]",
    });

    if (typeof config.content === "string") {
        setHtml(modalBody, config.content);
    } else if (config.content instanceof HTMLElement) {
        modalBody.appendChild(config.content);
    }

    const modalFooter = h("div", {
        className:
            "flex items-center justify-between p-4 sm:p-5 border-t-4 border-black dark:border-white bg-[#f4f4f0] dark:bg-[#0a0a0a] gap-4",
    });

    let errorElement = null;
    if (config.errorElementId) {
        errorElement = h(
            "p",
            {
                id: config.errorElementId,
                className: "text-[#FF3366] text-sm font-bold hidden mb-0 min-w-[200px] text-center",
            },
            "",
        );
    }

    const leftGroup = h("div", { className: "flex gap-4" });
    const rightGroup = h("div", { className: "flex gap-4" });

    config.buttons.forEach((btnConfig, index) => {
        const button = h(
            "button",
            {
                id: btnConfig.id,
                className: `btn btn-${btnConfig.type || "secondary"}`,
            },
            btnConfig.text,
        );

        if (btnConfig.onClick && typeof btnConfig.onClick === "function") {
            button.addEventListener("click", btnConfig.onClick);
        }

        (index === 0 ? leftGroup : rightGroup).appendChild(button);
    });

    modalFooter.appendChild(leftGroup);
    if (errorElement) {
        modalFooter.appendChild(errorElement);
    }
    modalFooter.appendChild(rightGroup);

    // --- Assembly ---
    modalDialog.appendChild(modalHeader);
    modalDialog.appendChild(modalBody);
    if (config.buttons && config.buttons.length > 0) {
        modalDialog.appendChild(modalFooter);
    }
    modalBackdrop.appendChild(modalDialog);
    DOM.modalContainer?.appendChild(modalBackdrop);
    renderIcons();

    // Trigger animations
    requestAnimationFrame(() => {
        toggleClass(modalBackdrop, "opacity-100", true);
        toggleClass(modalDialog, "scale-100", true);

        if (config.onOpen && typeof config.onOpen === "function") {
            config.onOpen();
        }
    });

    // Handlers
    let escapeHandler = null;
    if (config.closeOnEscape) {
        escapeHandler = (event) => {
            const topmostModalId = Array.from(activeModals.keys()).pop();
            if (event.key === "Escape" && id === topmostModalId) {
                event.stopPropagation();
                hideModal(id);
            }
        };
        document.addEventListener("keydown", escapeHandler);
    }

    let backdropClickHandler = null;
    if (config.closeOnBackdropClick) {
        backdropClickHandler = () => hideModal(id);
        modalBackdrop.addEventListener("click", backdropClickHandler);
    }

    activeModals.set(id, {
        element: modalBackdrop,
        escHandler: escapeHandler,
        backdropHandler: backdropClickHandler,
        onClose: config.onClose,
    });
}

/**
 * @param {string} id - The ID of the modal to hide.
 */
export function hideModal(id) {
    const modalInfo = activeModals.get(id);
    if (!modalInfo) return;

    const { element: modalBackdrop, escHandler, backdropHandler, onClose } = modalInfo;
    const modalDialog = modalBackdrop.querySelector(":scope > div");

    if (escHandler) {
        document.removeEventListener("keydown", escHandler);
    }
    if (backdropHandler) {
        modalBackdrop.removeEventListener("click", backdropHandler);
    }

    toggleClass(modalBackdrop, "opacity-100", false);
    if (modalDialog) toggleClass(modalDialog, "scale-100", false);

    modalBackdrop.addEventListener(
        "transitionend",
        () => {
            modalBackdrop.remove();
            if (onClose && typeof onClose === "function") {
                try {
                    onClose();
                } catch (e) {
                    console.error(`Error in modal onClose callback for ID "${id}":`, e);
                }
            }
            activeModals.delete(id);
        },
        { once: true },
    );
}
