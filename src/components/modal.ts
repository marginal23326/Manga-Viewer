import { $, DOM, bodyScroll, h, toggleClass } from "@/core/dom-utils";
import { emitAppEvent } from "@/core/app-events";
import { iconSvg } from "@/core/icons";

export type ModalButtonType = "danger" | "primary" | "secondary";
export type ModalSize = "lg" | "md" | "sm" | "xl";

export interface ModalButtonConfig {
    id?: string;
    onClick?: (event: MouseEvent) => void;
    side?: "left" | "right";
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
    element: HTMLDivElement;
    listeners: AbortController;
    onClose: (() => void) | null | undefined;
}

const activeModals = new Map<string, ActiveModal>();

export function isModalOpen(): boolean {
    return activeModals.size > 0;
}

const sizeClasses: Record<ModalSize, string> = {
    lg: "max-w-lg",
    md: "max-w-md",
    sm: "max-w-sm",
    xl: "max-w-xl",
};

/** Creates and shows a modal dialog. */
export function showModal(id: string, options: ModalOptions = {}): void {
    if ($(`.modal-backdrop#${id}`)) {
        return;
    }

    const config = {
        buttons: [{ onClick: () => hideModal(id), text: "Okay", type: "secondary" as const }],
        closeOnBackdropClick: true,
        closeOnEscape: true,
        content: "<p>Nothing here.</p>",
        showCloseButton: true,
        size: "md" as ModalSize,
        title: "Notice",
        ...options,
    };

    // --- Backdrop ---
    const modalBackdrop = h("div", {
        className:
            "modal-backdrop fixed inset-0 flex items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-250 ease-out opacity-0 z-[100]",
        id,
        role: "dialog",
        style: { zIndex: `${100 + activeModals.size}` },
    });

    // --- Dialog Container ---
    const modalDialog = h("div", {
        className: `surface-panel w-full ${sizeClasses[config.size]} flex flex-col max-h-[90vh] scale-[0.97] opacity-0 transition-all duration-250 ease-out relative`,
    });
    modalDialog.addEventListener("click", (event) => event.stopPropagation());

    // --- Header ---
    const modalHeader = h("div", {
        className: "flex items-center justify-between px-6 py-5 border-b divider-line",
    });

    const modalTitle = h(
        "h2",
        {
            className: "font-serif text-[22px] font-medium text-ink dark:text-paper leading-none",
            id: `${id}-title`,
        },
        config.title,
    );

    modalHeader.append(modalTitle);

    if (config.showCloseButton) {
        const closeButton = h(
            "button",
            {
                className: "btn-icon -mr-1.5",
                onclick: () => hideModal(id),
                title: "Close",
            },
            iconSvg("X", { size: 18 }),
        );
        modalHeader.append(closeButton);
    }

    // --- Body ---
    const modalBody = h("div", {
        className: "px-6 py-6 overflow-y-auto scrollbar-thin",
    });

    if (typeof config.content === "string") {
        modalBody.innerHTML = config.content;
    } else if (config.content instanceof HTMLElement) {
        modalBody.append(config.content);
    }

    const modalFooter = h("div", {
        className: "flex items-center justify-between px-6 py-5 border-t divider-line gap-4",
    });

    let errorElement: HTMLParagraphElement | null = null;
    if (config.errorElementId) {
        errorElement = h(
            "p",
            {
                className: "text-accent dark:text-accent-light text-sm font-medium mb-0 min-w-[200px] text-center",
                hidden: true,
                id: config.errorElementId,
            },
            "",
        );
    }

    const leftGroup = h("div", { className: "flex gap-3" });
    const rightGroup = h("div", { className: "flex gap-3" });

    config.buttons.forEach((btnConfig) => {
        const button = h(
            "button",
            {
                className: `btn-${btnConfig.type ?? "secondary"}`,
                id: btnConfig.id,
            },
            btnConfig.text,
        );

        if (btnConfig.onClick) {
            button.addEventListener("click", btnConfig.onClick);
        }

        (btnConfig.side === "left" ? leftGroup : rightGroup).append(button);
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
        toggleClass(modalDialog, "scale-100 opacity-100", true);
        config.onOpen?.();
    });

    // Handlers
    const listeners = new AbortController();
    const { signal } = listeners;

    if (config.closeOnEscape) {
        document.addEventListener(
            "keydown",
            (event) => {
                const topmostModalId = [...activeModals.keys()].pop();
                if (event.key === "Escape" && id === topmostModalId) {
                    event.stopPropagation();
                    hideModal(id);
                }
            },
            { signal },
        );
    }

    if (config.closeOnBackdropClick) {
        modalBackdrop.addEventListener("click", () => hideModal(id), { signal });
    }

    activeModals.set(id, {
        element: modalBackdrop,
        listeners,
        onClose: config.onClose,
    });

    bodyScroll.lock();
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
            { onClick: () => hideModal(id), side: "left", text: cancelText, type: "secondary" },
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

    const { element: modalBackdrop, listeners, onClose } = modalInfo;
    const modalDialog = $(":scope > div", modalBackdrop);

    listeners.abort();

    toggleClass(modalBackdrop, "opacity-100", false);
    if (modalDialog) toggleClass(modalDialog, "scale-100 opacity-100", false);

    let done = false;
    const finish = (event?: Event): void => {
        if (done || (event && event.target !== modalBackdrop)) return;
        done = true;
        clearTimeout(fallback);
        modalBackdrop.remove();
        activeModals.delete(id);
        if (onClose) {
            try {
                onClose();
            } catch (error) {
                console.error(`Error in modal onClose callback for ID "${id}":`, error);
            }
        }
        bodyScroll.unlock();
        if (activeModals.size === 0) emitAppEvent("lastModalClosed");
    };

    const fallback = setTimeout(finish, 400);
    modalBackdrop.addEventListener("transitionend", finish);
}
