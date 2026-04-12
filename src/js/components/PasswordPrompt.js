import { createElement } from "lucide";

import { $, hideElement, showElement, h } from "../core/DOMUtils";
import { AppIcons } from "../core/icons";
import { UIState } from "../core/State";

import { showModal, hideModal } from "./Modal";

const PASSWORD_MODAL_ID = "password-entry-modal";
let successCallback = null;
let storedPassword = "";

function createPasswordForm() {
    const container = h("div");

    const errorMessage = h(
        "div",
        {
            id: "password-error-msg",
            className:
                "hidden bg-[#FF3366] text-white font-space font-bold uppercase tracking-widest text-xs p-3 mb-6 brutal-border brutal-shadow",
        },
        "ERR: AUTHENTICATION FAILED",
    );

    const input = h("input", {
        type: "password",
        id: "password-input-field",
        placeholder: "ENTER ACCESS CODE",
        className:
            "block w-full px-4 py-3 pr-16 brutal-border rounded-none bg-paper dark:bg-ink text-black dark:text-white font-space font-bold placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:uppercase brutal-input-focus transition-all duration-150",
    });

    const initialIconSvg = createElement(AppIcons.Eye, {
        width: "24",
        height: "24",
        "stroke-width": "3",
    });

    const toggleButton = h(
        "button",
        {
            type: "button",
            className:
                "absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black border-l-2 border-black dark:border-white hover:bg-[#FF3366] dark:hover:bg-[#FF3366] hover:text-white transition-colors cursor-pointer outline-none focus:ring-0",
        },
        initialIconSvg,
    );

    const inputGroup = h("div", { className: "relative mb-6 flex" }, input, toggleButton);

    container.appendChild(errorMessage);
    container.appendChild(inputGroup);

    toggleButton.addEventListener("click", () => {
        const isPassword = input.type === "password";
        const newType = isPassword ? "text" : "password";
        const newIconName = isPassword ? "EyeOff" : "Eye";

        input.type = newType;

        const newIconSvg = createElement(AppIcons[newIconName], {
            width: "24",
            height: "24",
            "stroke-width": "3",
        });

        toggleButton.innerHTML = "";
        toggleButton.appendChild(newIconSvg);
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
        title: "SYSTEM LOCK",
        content: formContent,
        size: "sm",
        closeOnBackdropClick: false,
        closeOnEscape: false,
        showCloseButton: false,
        buttons: [
            {
                text: "AUTHORIZE",
                type: "primary",
                id: "submit-password-btn",
                onClick: verifyPassword,
            },
        ],
        onClose: () => {
            successCallback = null;
            storedPassword = "";
        },
    });

    setTimeout(() => {
        const inputField = $("#password-input-field");
        inputField?.focus();
    }, 100);
}
