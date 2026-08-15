import { $, DOM, h, setHtml, toggleClass } from "@/core/dom-utils";
import { iconSvg } from "@/core/icons";

export type ModalButtonType = "danger" | "primary" | "secondary";
export type ModalSize = "lg" | "md" | "sm" | "xl";

export interface ModalButtonConfig {
    id?: string;
    onClick?: (event: MouseEvent) => void;
    text: string;
    type?: ModalButtonType;
}

export interface ModalOptions {
    buttons?: ModalButtonConfig[];
    closeOnBackdropClick?: boolean;
    closeOnEscape?: boolean;
    content?: HTMLElement | string;
    errorElementId?: string;
    onClose?: (() => void) | null;
    onOpen?: () => void;
    showCloseButton?: boolean;
    size?: ModalSize;
    title?: string;
}

interface ActiveModal {
    backdropHandler: (() => void) | null;
    element: HTMLDivElement;
    escHandler: ((event: KeyboardEvent) => void) | null;
    onClose: (() => void) | null | undefined;
}

const activeModals = new Map<string, ActiveModal>();

const sizeClasses: Record<ModalSize, string> = {
    lg: "max-w-lg",
    md: "max-w-md",
    sm: "max-w-sm",
    xl: "max-w-xl",
};

/** Creates and shows a brutalist modal dialog. */
export function showModal(id: string, options: ModalOptions = {}): void {
    if ($(`.modal-backdrop#${id}`)) {
        return;
    }

    const config = {
        buttons: [{ onClick: () => hideModal(id), text: "ACKNOWLEDGE", type: "secondary" as const }],
        closeOnBackdropClick: true,
        closeOnEscape: true,
        content: "<p>NO DATA.</p>",
        showCloseButton: true,
        size: "md" as ModalSize,
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
        className: `bg-paper dark:bg-ink border-4 border-black dark:border-white brutal-shadow-2xl-accent w-full ${sizeClasses[config.size]} flex flex-col max-h-[90vh] scale-95 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-none relative`,
    });
    modalDialog.addEventListener("click", (event) => event.stopPropagation());

    // --- Header ---
    const modalHeader = h("div", {
        className:
            "flex items-center justify-between p-4 sm:p-5 border-b-4 border-black dark:border-white bg-paper dark:bg-ink",
    });

    const titleWrapper = h("div", { className: "flex items-center space-x-3" });
    const titleAccent = h("div", { className: "w-4 h-4 bg-accent brutal-border" });
    const modalTitle = h(
        "h2",
        {
            className:
                "text-2xl font-syne font-bold uppercase tracking-tight text-black dark:text-white leading-none mt-1",
            id: `${id}-title`,
        },
        config.title,
    );

    titleWrapper.append(titleAccent, modalTitle);
    modalHeader.append(titleWrapper);

    if (config.showCloseButton) {
        const closeIcon = iconSvg("X");
        const closeButton = h(
            "button",
            {
                className:
                    "btn-icon !p-1 w-10 h-10 bg-black text-white dark:bg-white dark:text-black hover:bg-accent hover:text-white dark:hover:bg-accent dark:hover:text-white brutal-border brutal-shadow-sm-accent hover:brutal-shadow",
                onclick: () => hideModal(id),
            },
            closeIcon,
        );
        modalHeader.append(closeButton);
    }

    // --- Body ---
    const modalBody = h("div", {
        className: "p-4 sm:p-6 overflow-y-auto bg-paper dark:bg-ink brutal-scrollbar",
    });

    if (typeof config.content === "string") {
        setHtml(modalBody, config.content);
    } else if (config.content instanceof HTMLElement) {
        modalBody.append(config.content);
    }

    const modalFooter = h("div", {
        className:
            "flex items-center justify-between p-4 sm:p-5 border-t-4 border-black dark:border-white bg-paper dark:bg-ink gap-4",
    });

    let errorElement: HTMLParagraphElement | null = null;
    if (config.errorElementId) {
        errorElement = h(
            "p",
            {
                className: "text-accent text-sm font-bold hidden mb-0 min-w-[200px] text-center",
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
                className: `btn btn-${btnConfig.type ?? "secondary"}`,
                id: btnConfig.id,
            },
            btnConfig.text,
        );

        if (btnConfig.onClick) {
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
    modalDialog.append(modalHeader, modalBody);
    if (config.buttons.length > 0) {
        modalDialog.append(modalFooter);
    }
    modalBackdrop.append(modalDialog);
    DOM.modalContainer?.append(modalBackdrop);

    // Trigger animations
    requestAnimationFrame(() => {
        toggleClass(modalBackdrop, "opacity-100", true);
        toggleClass(modalDialog, "scale-100", true);
        config.onOpen?.();
    });

    // Handlers
    let escapeHandler: ((event: KeyboardEvent) => void) | null = null;
    if (config.closeOnEscape) {
        escapeHandler = (event: KeyboardEvent) => {
            const topmostModalId = [...activeModals.keys()].pop();
            if (event.key === "Escape" && id === topmostModalId) {
                event.stopPropagation();
                hideModal(id);
            }
        };
        document.addEventListener("keydown", escapeHandler);
    }

    let backdropClickHandler: (() => void) | null = null;
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

export interface ConfirmModalOptions {
    cancelText?: string;
    confirmText?: string;
    content: HTMLElement | string;
    onConfirm: (event: MouseEvent) => void;
    title: string;
}

export function confirmModal(id: string, options: ConfirmModalOptions): void {
    const { cancelText = "Cancel", confirmText = "Confirm", content, onConfirm, title } = options;

    showModal(id, {
        buttons: [
            { onClick: () => hideModal(id), text: cancelText, type: "secondary" },
            { onClick: onConfirm, text: confirmText, type: "danger" },
        ],
        closeOnBackdropClick: false,
        content,
        size: "sm",
        title,
    });
}

export function hideModal(id: string): void {
    const modalInfo = activeModals.get(id);
    if (!modalInfo) return;

    const { backdropHandler, element: modalBackdrop, escHandler, onClose } = modalInfo;
    const modalDialog = $(":scope > div", modalBackdrop);

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
            if (onClose) {
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
