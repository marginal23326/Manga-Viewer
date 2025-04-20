import { AppState } from "../core/AppState";
import { showModal, hideModal } from "./Modal";
import { $, addClass, setText, setAttribute, hideElement, showElement } from "../core/DOMUtils";
import { createElement } from "lucide";
import { AppIcons } from "../core/icons";
import SHA256 from "crypto-js/sha256";
import Hex from "crypto-js/enc-hex";

const PASSWORD_MODAL_ID = "password-entry-modal";
let successCallback = null;
let storedRequiredHash = "";

function createPasswordForm() {
    const container = document.createElement("div");

    const errorMessage = document.createElement("p");
    errorMessage.id = "password-error-msg";
    addClass(errorMessage, "text-red-500 text-sm mb-2 hidden");
    setText(errorMessage, "Incorrect password. Please try again.");

    const inputGroup = document.createElement("div");
    addClass(inputGroup, "relative mb-4");

    const input = document.createElement("input");
    input.type = "password";
    input.id = "password-input-field";
    addClass(input, "block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100");
    setAttribute(input, "placeholder", "Enter password");

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    addClass(toggleButton, "absolute top-1/2 right-2 transform -translate-y-1/2 btn-icon text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white");

    const initialIconSvg = createElement(AppIcons.Eye, {
        width: "18",
        height: "18",
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
            width: "18",
            height: "18",
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
        AppState.update("isPasswordVerified", true, false);
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
        title: "Enter Password",
        content: formContent,
        size: "sm",
        closeOnBackdropClick: false,
        closeOnEscape: false,
        showCloseButton: false,
        buttons: [
            {
                text: "Submit",
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
