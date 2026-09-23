import { bodyScroll, h, requireElement, toggleClass } from "@/core/dom-utils";

const modalContainer = requireElement("#modal-container");

type ModalSize = "lg" | "sm" | "xl";

export interface ModalButtonConfig {
    onClick?: (event: MouseEvent) => void;
    side?: "left" | "right";
    text: string;
    type?: "danger" | "primary" | "secondary";
}

export interface ModalOptions {
    buttons: ModalButtonConfig[];
    closeOnBackdropClick?: boolean;
    closeOnEscape?: boolean;
    content: HTMLElement;
    onClose?: (() => void) | null;
    onOpen?: () => void;
    size?: ModalSize;
    title: string;
}

export interface ModalController {
    close: () => void;
    show: (createOptions: () => ModalOptions) => void;
}

const sizeClasses: Record<ModalSize, string> = {
    lg: "max-w-[min(36rem,calc(100vw-2rem))]",
    sm: "max-w-[min(24rem,calc(100vw-2rem))]",
    xl: "max-w-[min(44rem,calc(100vw-2rem))]",
};

let openModalsCount = 0;
const visibilityListeners = new Set<(open: boolean) => void>();

function notifyVisibilityChanged(open: boolean): void {
    for (const listener of visibilityListeners) listener(open);
}

export function isModalOpen(): boolean {
    return openModalsCount > 0;
}

export function onModalVisibilityChange(listener: (open: boolean) => void): void {
    visibilityListeners.add(listener);
}

export function createModal(): ModalController {
    let current: { dialog: HTMLDialogElement; listeners: AbortController; onClose?: (() => void) | null } | null = null;
    let closing = false;

    function close(): void {
        if (!current || closing) return;
        closing = true;

        const { dialog, listeners, onClose } = current;
        listeners.abort();
        toggleClass(dialog, "is-visible", false);

        let done = false;
        const finish = (event?: Event): void => {
            if (done || (event && event.target !== dialog)) return;
            done = true;
            clearTimeout(fallback);
            dialog.close();
            dialog.remove();
            current = null;
            closing = false;
            if (onClose) {
                try {
                    onClose();
                } catch (error) {
                    console.error("Error in modal onClose callback:", error);
                }
            }
            bodyScroll.unlock();
            if (--openModalsCount === 0) notifyVisibilityChanged(false);
        };

        const fallback = setTimeout(finish, 400);
        dialog.addEventListener("transitionend", finish);
    }

    function show(createOptions: () => ModalOptions): void {
        if (current) return;

        const {
            buttons,
            closeOnBackdropClick = false,
            closeOnEscape = true,
            content,
            onClose,
            onOpen,
            size = "sm",
            title,
        } = createOptions();

        const dialog = h("dialog", { className: `modal ${sizeClasses[size]}` });

        const modalHeader = h(
            "div",
            { className: "flex items-center px-6 py-4 border-b divider-line" },
            h("h2", { className: "font-serif text-lg font-medium text-ink dark:text-paper leading-none" }, title),
        );

        const modalBody = h("div", { className: "px-6 py-5 overflow-y-auto scrollbar-thin" }, content);

        const modalFooter = h("div", {
            className: "flex items-center justify-between px-6 py-4 border-t divider-line gap-4",
        });

        const leftGroup = h("div", { className: "flex gap-3" });
        const rightGroup = h("div", { className: "flex gap-3" });

        for (const btnConfig of buttons) {
            const button = h(
                "button",
                {
                    className: `btn-${btnConfig.type ?? "secondary"}`,
                    onclick: btnConfig.onClick,
                },
                btnConfig.text,
            );
            (btnConfig.side === "left" ? leftGroup : rightGroup).append(button);
        }

        modalFooter.append(leftGroup, rightGroup);
        dialog.append(modalHeader, modalBody);
        if (buttons.length > 0) dialog.append(modalFooter);
        modalContainer.append(dialog);

        const listeners = new AbortController();
        const { signal } = listeners;

        dialog.addEventListener(
            "cancel",
            (event) => {
                event.preventDefault();
                if (closeOnEscape) close();
            },
            { signal },
        );

        if (closeOnBackdropClick) {
            dialog.addEventListener(
                "click",
                (event) => {
                    if (event.target === dialog) close();
                },
                { signal },
            );
        }

        current = { dialog, listeners, onClose };
        if (++openModalsCount === 1) notifyVisibilityChanged(true);

        dialog.showModal();
        bodyScroll.lock();

        requestAnimationFrame(() => {
            if (current?.dialog !== dialog || closing) return;
            toggleClass(dialog, "is-visible", true);
            onOpen?.();
        });
    }

    return { close, show };
}
