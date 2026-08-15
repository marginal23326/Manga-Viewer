import { h, setVisible } from "@/core/dom-utils";
import { hideModal, showModal } from "@/components/modal";
import { iconSvg, setIcon } from "@/core/icons";
import { UIState } from "@/state";

const PASSWORD_MODAL_ID = "password-entry-modal";
let successCallback: (() => void) | null = null;
let storedPassword = "";
let inputElement: HTMLInputElement | null = null;
let errorMessageElement: HTMLDivElement | null = null;

function createPasswordForm(): HTMLDivElement {
    const container = h("div");

    const errorMessage = h(
        "div",
        {
            className: "hidden bg-accent text-white text-label text-xs p-3 mb-6 brutal-border brutal-shadow",
        },
        "ERR: AUTHENTICATION FAILED",
    );

    const input = h("input", {
        className:
            "block w-full px-4 py-3 pr-16 brutal-input placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:uppercase brutal-input-focus transition-all duration-150",
        placeholder: "ENTER ACCESS CODE",
        type: "password",
    });

    errorMessageElement = errorMessage;
    inputElement = input;

    const initialIconSvg = iconSvg("Eye");

    const toggleButton = h(
        "button",
        {
            className:
                "absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black border-l-2 border-black dark:border-white hover:bg-accent dark:hover:bg-accent hover:text-white transition-colors cursor-pointer outline-none focus:ring-0",
            type: "button",
        },
        initialIconSvg,
    );

    const inputGroup = h("div", { className: "relative mb-6 flex" }, input, toggleButton);

    container.append(errorMessage, inputGroup);

    toggleButton.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        setIcon(toggleButton, isPassword ? "EyeOff" : "Eye");
        toggleButton.blur();
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            verifyPassword();
        } else {
            setVisible(errorMessage, false);
        }
    });

    return container;
}

function verifyPassword(): void {
    if (!inputElement || !errorMessageElement) return;

    const enteredPassword = inputElement.value;
    if (!enteredPassword) return;

    if (enteredPassword === storedPassword) {
        UIState.update("isPasswordVerified", true);
        hideModal(PASSWORD_MODAL_ID);
        successCallback?.();
    } else {
        setVisible(errorMessageElement, true);
        inputElement.value = "";
        inputElement.focus();
    }
}

/** Initializes and shows the password prompt modal. */
export function initPasswordPrompt(password: string, onVerifiedCallback: () => void): void {
    successCallback = onVerifiedCallback;
    storedPassword = password;

    const formContent = createPasswordForm();

    showModal(PASSWORD_MODAL_ID, {
        buttons: [
            {
                id: "submit-password-btn",
                onClick: verifyPassword,
                text: "AUTHORIZE",
                type: "primary",
            },
        ],
        closeOnBackdropClick: false,
        closeOnEscape: false,
        content: formContent,
        onClose: () => {
            successCallback = null;
            storedPassword = "";
            inputElement = null;
            errorMessageElement = null;
        },
        showCloseButton: false,
        size: "sm",
        title: "SYSTEM LOCK",
    });

    setTimeout(() => {
        inputElement?.focus();
    }, 100);
}
