import Hex from "crypto-js/enc-hex";
import SHA256 from "crypto-js/sha256";
import { createElement } from "lucide";

import { $, addClass, setText, setAttribute, hideElement, showElement } from "../core/DOMUtils";
import { AppIcons } from "../core/icons";
import { State } from "../core/State";

import { showModal, hideModal } from "./Modal";

const PASSWORD_MODAL_ID = "password-entry-modal";
let successCallback = null;
let storedRequiredHash = "";

function createPasswordForm() {
    const container = document.createElement("div");

    // Error Message
    const errorMessage = document.createElement("div");
    errorMessage.id = "password-error-msg";
    addClass(
        errorMessage,
        "hidden bg-[#FF3366] text-white font-space font-bold uppercase tracking-widest text-xs p-3 mb-6 border-2 border-black dark:border-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] dark:shadow-[4px_4px_0_0_rgba(255,255,255,1)]",
    );
    setText(errorMessage, "ERR: AUTHENTICATION FAILED");

    const inputGroup = document.createElement("div");
    addClass(inputGroup, "relative mb-6 flex");

    // Input Field
    const input = document.createElement("input");
    input.type = "password";
    input.id = "password-input-field";
    addClass(
        input,
        "block w-full px-4 py-3 pr-16 border-2 border-black dark:border-white rounded-none bg-[#f4f4f0] dark:bg-[#0a0a0a] text-black dark:text-white font-space font-bold placeholder:text-black/30 dark:placeholder:text-white/30 placeholder:uppercase focus:outline-none focus:ring-0 focus:border-[#FF3366] dark:focus:border-[#FF3366] focus:shadow-[4px_4px_0_0_#FF3366] transition-all duration-150",
    );
    setAttribute(input, { placeholder: "ENTER ACCESS CODE" });

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    addClass(
        toggleButton,
        "absolute top-0 right-0 bottom-0 w-14 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black border-l-2 border-black dark:border-white hover:bg-[#FF3366] dark:hover:bg-[#FF3366] hover:text-white transition-colors cursor-pointer outline-none focus:ring-0",
    );

    const initialIconSvg = createElement(AppIcons.Eye, {
        width: "24",
        height: "24",
        "stroke-width": "3", // Thicker stroke
    });
    toggleButton.appendChild(initialIconSvg);

    inputGroup.appendChild(input);
    inputGroup.appendChild(toggleButton);

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

    const hashedInput = SHA256(enteredPassword).toString(Hex);

    if (hashedInput === storedRequiredHash) {
        State.update("isPasswordVerified", true, false);
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
 * @param {string} requiredHash - The SHA256 hash to verify against.
 * @param {Function} onVerifiedCallback - Function to call after successful verification.
 */
export function initPasswordPrompt(requiredHash, onVerifiedCallback) {
    successCallback = onVerifiedCallback;
    storedRequiredHash = requiredHash;

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
            storedRequiredHash = "";
        },
    });

    setTimeout(() => {
        const inputField = $("#password-input-field");
        inputField?.focus();
    }, 100);
}
