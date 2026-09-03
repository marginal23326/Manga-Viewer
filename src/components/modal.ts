import { DOM, bodyScroll, h, toggleClass } from "@/core/dom-utils";
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
    onClose?: (() => void) | null;
    onOpen?: () => void;
    showCloseButton?: boolean;
    size?: ModalSize;
    title?: string;
}

interface ActiveModal {
    closing: boolean;
    dialog: HTMLDialogElement;
    listeners: AbortController;
    onClose: (() => void) | null | undefined;
}

const activeModals = new Map<string, ActiveModal>();

export function isModalOpen(): boolean {
    return activeModals.size > 0;
}

const sizeClasses: Record<ModalSize, string> = {
    lg: "max-w-[min(32rem,calc(100vw-2rem))]",
    md: "max-w-[min(28rem,calc(100vw-2rem))]",
    sm: "max-w-[min(24rem,calc(100vw-2rem))]",
    xl: "max-w-[min(36rem,calc(100vw-2rem))]",
};

/** Creates and shows a modal dialog. */
export function showModal(id: string, options: ModalOptions = {}): void {
    if (activeModals.has(id)) {
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

    const dialog = h("dialog", {
        className: `modal ${sizeClasses[config.size]}`,
        id,
    });

    // --- Header ---
    const modalHeader = h("div", {
        className: "flex items-center justify-between px-6 py-5 border-b divider-line",
    });

    const modalTitle = h(
        "h2",
        {
            className: "font-serif text-[22px] font-medium text-ink dark:text-paper leading-none",
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

    modalFooter.append(leftGroup, rightGroup);

    // --- Assembly ---
    dialog.append(modalHeader, modalBody);
    if (config.buttons.length > 0) {
        dialog.append(modalFooter);
    }
    DOM.modalContainer?.append(dialog);

    // Handlers
    const listeners = new AbortController();
    const { signal } = listeners;

    dialog.addEventListener(
        "cancel",
        (event) => {
            event.preventDefault();
            if (config.closeOnEscape) hideModal(id);
        },
        { signal },
    );

    if (config.closeOnBackdropClick) {
        dialog.addEventListener(
            "click",
            (event) => {
                if (event.target === dialog) hideModal(id);
            },
            { signal },
        );
    }

    activeModals.set(id, { closing: false, dialog, listeners, onClose: config.onClose });

    dialog.showModal();
    bodyScroll.lock();

    requestAnimationFrame(() => {
        toggleClass(dialog, "is-visible", true);
        config.onOpen?.();
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
    if (!modalInfo || modalInfo.closing) return;
    modalInfo.closing = true;

    const { dialog, listeners, onClose } = modalInfo;
    listeners.abort();

    toggleClass(dialog, "is-visible", false);

    let done = false;
    const finish = (event?: Event): void => {
        if (done || (event && event.target !== dialog)) return;
        done = true;
        clearTimeout(fallback);
        dialog.close();
        dialog.remove();
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
    dialog.addEventListener("transitionend", finish);
}
