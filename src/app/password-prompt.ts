import { h, setVisible } from "@/core/dom-utils";
import { hideModal, showModal } from "@/components/modal";
import { iconSvg, setIcon } from "@/core/icons";
import { UIState } from "@/state";

const PASSWORD_MODAL_ID = "password-entry-modal";

interface PasswordPromptSession {
    errorMessage: HTMLDivElement;
    input: HTMLInputElement;
    onVerified: () => void;
    password: string;
}

let session: PasswordPromptSession | null = null;

function createPasswordForm(): { container: HTMLDivElement; errorMessage: HTMLDivElement; input: HTMLInputElement } {
    const container = h("div");

    const errorMessage = h(
        "div",
        {
            className: "text-accent dark:text-accent-light bg-accent/10 text-sm font-medium p-3 rounded-xl mb-5",
            hidden: true,
        },
        "Incorrect password. Try again.",
    );

    const input = h("input", {
        className: "input-field pr-14",
        placeholder: "Enter access code",
        type: "password",
    });

    const initialIconSvg = iconSvg("Eye", { size: 17 });

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

        setIcon(toggleButton, isPassword ? "EyeOff" : "Eye", { size: 17 });
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

    return { container, errorMessage, input };
}

function verifyPassword(): void {
    if (!session) return;
    const { errorMessage, input, onVerified, password } = session;

    const enteredPassword = input.value;
    if (!enteredPassword) return;

    if (enteredPassword === password) {
        UIState.update("isPasswordVerified", true);
        hideModal(PASSWORD_MODAL_ID);
        onVerified();
    } else {
        setVisible(errorMessage, true);
        input.value = "";
        input.focus();
    }
}

/** Initializes and shows the password prompt modal. */
export function initPasswordPrompt(password: string, onVerifiedCallback: () => void): void {
    const { container, errorMessage, input } = createPasswordForm();
    session = { errorMessage, input, onVerified: onVerifiedCallback, password };

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
        content: container,
        onClose: () => {
            session = null;
        },
        showCloseButton: false,
        size: "sm",
        title: "Locked",
    });

    setTimeout(() => {
        input.focus();
    }, 100);
}
