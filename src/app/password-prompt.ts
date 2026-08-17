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
            className: "hidden text-accent dark:text-accent-light bg-accent/10 text-sm font-medium p-3 rounded-xl mb-5",
        },
        "Incorrect password. Try again.",
    );

    const input = h("input", {
        className: "input-field pr-14",
        placeholder: "Enter access code",
        type: "password",
    });

    errorMessageElement = errorMessage;
    inputElement = input;

    const initialIconSvg = iconSvg("Eye", { size: 17, strokeWidth: 2 });

    const toggleButton = h(
        "button",
        {
            className:
                "absolute top-0 right-0 bottom-0 w-11 flex items-center justify-center text-ink/45 dark:text-paper/40 hover:text-ink dark:hover:text-paper transition-colors cursor-pointer outline-none",
            type: "button",
        },
        initialIconSvg,
    );

    const inputGroup = h("div", { className: "relative mb-5 flex" }, input, toggleButton);

    container.append(errorMessage, inputGroup);

    toggleButton.addEventListener("click", () => {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        setIcon(toggleButton, isPassword ? "EyeOff" : "Eye", { size: 17, strokeWidth: 2 });
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
        UIState.isPasswordVerified = true;
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
                text: "Unlock",
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
        title: "Locked",
    });

    setTimeout(() => {
        inputElement?.focus();
    }, 100);
}
