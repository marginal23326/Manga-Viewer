import { $, h, hideElement, showElement } from "../core/dom-utils";
import { hideModal, showModal } from "./modal";
import { AppIcons } from "../core/icons";
import { UIState } from "../state/state";
import { createElement } from "lucide";

const PASSWORD_MODAL_ID = "password-entry-modal";
let successCallback = null;
let storedPassword = "";

function createPasswordForm() {
    const container = h("div");

    const errorMessage = h(
        "div",
        {
            className:
                "hidden bg-[#FF3366] text-white font-space font-bold uppercase tracking-widest text-xs p-3 mb-6 brutal-border brutal-shadow",
            id: "password-error-msg",
        },
        "ERR: AUTHENTICATION FAILED",
    );

    const input = h("input", {
        className:
            "block w-full px-4 py-3 pr-16 brutal-border rounded-none bg-paper dark:bg-ink text-black dark:text-white font-space font-bold placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:uppercase brutal-input-focus transition-all duration-150",
        id: "password-input-field",
        placeholder: "ENTER ACCESS CODE",
        type: "password",
    });

    const initialIconSvg = createElement(AppIcons.Eye, {
        height: "24",
        "stroke-width": "3",
        width: "24",
    });

    const toggleButton = h(
        "button",
        {
            className:
                "absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black border-l-2 border-black dark:border-white hover:bg-[#FF3366] dark:hover:bg-[#FF3366] hover:text-white transition-colors cursor-pointer outline-none focus:ring-0",
            type: "button",
        },
        initialIconSvg,
    );

    const inputGroup = h("div", { className: "relative mb-6 flex" }, input, toggleButton);

    container.append(errorMessage);
    container.append(inputGroup);

    toggleButton.addEventListener("click", () => {
        const isPassword = input.type === "password";
        const newType = isPassword ? "text" : "password";
        const newIconName = isPassword ? "EyeOff" : "Eye";

        input.type = newType;

        const newIconSvg = createElement(AppIcons[newIconName], {
            height: "24",
            "stroke-width": "3",
            width: "24",
        });

        toggleButton.innerHTML = "";
        toggleButton.append(newIconSvg);
        toggleButton.blur();
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            verifyPassword();
        } else {
            hideElement(errorMessage);
        }
    });

    return container;
}

function verifyPassword() {
    const input = $("#password-input-field");
    const errorMsg = $("#password-error-msg");
    if (!input || !errorMsg) return;

    const enteredPassword = input.value;
    if (!enteredPassword) return;

    if (enteredPassword === storedPassword) {
        UIState.update("isPasswordVerified", true);
        hideModal(PASSWORD_MODAL_ID);
        if (successCallback) {
            successCallback();
        }
    } else {
        showElement(errorMsg);
        input.value = "";
        input.focus();
    }
}

/**
 * Initializes and shows the password prompt modal.
 * @param {string} password - The password to verify against.
 * @param {Function} onVerifiedCallback - Function to call after successful verification.
 */
export function initPasswordPrompt(password, onVerifiedCallback) {
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
        },
        showCloseButton: false,
        size: "sm",
        title: "SYSTEM LOCK",
    });

    setTimeout(() => {
        const inputField = $("#password-input-field");
        inputField?.focus();
    }, 100);
}
