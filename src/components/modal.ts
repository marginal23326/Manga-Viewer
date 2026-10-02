import { h } from "@/core/dom-utils";

type ModalSize = "lg" | "sm" | "xl";

interface ModalButtonConfig {
    onClick?: (event: MouseEvent) => void;
    side?: "left" | "right";
    text: string;
    type?: "danger" | "primary" | "secondary";
}

interface ModalOptions {
    buttons: ModalButtonConfig[];
    closeOnBackdropClick?: boolean;
    closeOnEscape?: boolean;
    content: HTMLElement;
    onClose?: () => void;
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

export function createModal(): ModalController {
    let current: { dialog: HTMLDialogElement; listeners: AbortController; onClose?: () => void } | null = null;

    function close(): void {
        if (!current) return;

        const { dialog, listeners, onClose } = current;
        current = null;
        listeners.abort();
        dialog.close();

        void Promise.allSettled(dialog.getAnimations().map((animation) => animation.finished)).then(() =>
            dialog.remove(),
        );

        if (onClose) {
            try {
                onClose();
            } catch (error) {
                console.error("Error in modal onClose callback:", error);
            }
        }
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
            { className: "flex items-center px-6 pt-5 pb-1" },
            h("h2", { className: "text-[19px] font-semibold tracking-tight leading-tight" }, title),
        );

        const modalBody = h("div", { className: "px-6 py-4 overflow-y-auto scrollbar-thin" }, content);

        const modalFooter = h("div", {
            className: "flex items-center justify-between px-6 py-4 border-t gap-4 bg-ink/[0.02] dark:bg-white/[0.02]",
        });

        const leftGroup = h("div", { className: "flex gap-2" });
        const rightGroup = h("div", { className: "flex gap-2" });

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
        document.body.append(dialog);

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

        dialog.showModal();
        onOpen?.();
    }

    return { close, show };
}
