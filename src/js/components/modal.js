import { $, DOM, h, setHtml, toggleClass } from "../core/dom-utils";
import { iconPlaceholder, renderIcons } from "../core/icons";

const activeModals = new Map();

const sizeClasses = {
    "2xl": "max-w-2xl",
    lg: "max-w-lg",
    md: "max-w-md",
    sm: "max-w-sm",
    xl: "max-w-xl",
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
        buttons: [{ onClick: () => hideModal(id), text: "ACKNOWLEDGE", type: "secondary" }],
        closeOnBackdropClick: true,
        closeOnEscape: true,
        content: "<p>NO DATA.</p>",
        onClose: null,
        showCloseButton: true,
        size: "md",
        title: "SYSTEM ALERT",
        ...options,
    };

    // --- Backdrop ---
    const modalBackdrop = h("div", {
        className:
            "modal-backdrop fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-300 opacity-0 z-[100]",
        id,
        role: "dialog",
        style: { zIndex: `${100 + activeModals.size}` },
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
            className:
                "text-2xl font-syne font-bold uppercase tracking-tight text-black dark:text-white leading-none mt-1",
            id: `${id}-title`,
        },
        config.title,
    );

    titleWrapper.append(titleAccent);
    titleWrapper.append(modalTitle);
    modalHeader.append(titleWrapper);

    let closeButton = null;
    if (config.showCloseButton) {
        const closeIcon = iconPlaceholder("x");
        closeButton = h(
            "button",
            {
                className:
                    "btn-icon !p-1 w-10 h-10 bg-black text-white dark:bg-white dark:text-black hover:bg-[#FF3366] hover:text-white dark:hover:bg-[#FF3366] dark:hover:text-white brutal-border brutal-shadow-sm-accent hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#fff]",
                onclick: () => hideModal(id),
            },
            closeIcon,
        );
        modalHeader.append(closeButton);
    }

    // --- Body ---
    const modalBody = h("div", {
        className:
            "p-4 sm:p-6 overflow-y-auto bg-[#f4f4f0] dark:bg-[#0a0a0a] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-[#f4f4f0] dark:[&::-webkit-scrollbar-track]:bg-[#0a0a0a] [&::-webkit-scrollbar-track]:border-l-2 [&::-webkit-scrollbar-track]:border-black dark:[&::-webkit-scrollbar-track]:border-white [&::-webkit-scrollbar-thumb]:bg-black dark:[&::-webkit-scrollbar-thumb]:bg-white [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-[#f4f4f0] dark:[&::-webkit-scrollbar-thumb]:border-[#0a0a0a]",
    });

    if (typeof config.content === "string") {
        setHtml(modalBody, config.content);
    } else if (config.content instanceof HTMLElement) {
        modalBody.append(config.content);
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
                className: "text-[#FF3366] text-sm font-bold hidden mb-0 min-w-[200px] text-center",
                id: config.errorElementId,
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
                className: `btn btn-${btnConfig.type || "secondary"}`,
                id: btnConfig.id,
            },
            btnConfig.text,
        );

        if (btnConfig.onClick && typeof btnConfig.onClick === "function") {
            button.addEventListener("click", btnConfig.onClick);
        }

        (index === 0 ? leftGroup : rightGroup).append(button);
    });

    modalFooter.append(leftGroup);
    if (errorElement) {
        modalFooter.append(errorElement);
    }
    modalFooter.append(rightGroup);

    // --- Assembly ---
    modalDialog.append(modalHeader);
    modalDialog.append(modalBody);
    if (config.buttons && config.buttons.length > 0) {
        modalDialog.append(modalFooter);
    }
    modalBackdrop.append(modalDialog);
    DOM.modalContainer?.append(modalBackdrop);
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
            const topmostModalId = [...activeModals.keys()].pop();
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
        backdropHandler: backdropClickHandler,
        element: modalBackdrop,
        escHandler: escapeHandler,
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
                } catch (error) {
                    console.error(`Error in modal onClose callback for ID "${id}":`, error);
                }
            }
            activeModals.delete(id);
        },
        { once: true },
    );
}
