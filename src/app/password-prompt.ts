import { h, setVisible } from "@/core/dom-utils";
import { iconSvg, setIcon } from "@/core/icons";
import { UIState } from "@/state";
import { createModal } from "@/components/modal";

const passwordModal = createModal();

function createPasswordForm(verifyPassword: () => void): {
    container: HTMLDivElement;
    errorMessage: HTMLDivElement;
    input: HTMLInputElement;
} {
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
        onkeydown: (event: KeyboardEvent) => {
            if (event.key === "Enter") {
                event.preventDefault();
                verifyPassword();
            } else {
                setVisible(errorMessage, false);
            }
        },
        placeholder: "Enter access code",
        type: "password",
    });

    const initialIconSvg = iconSvg("Eye", { size: 17 });

    const toggleButton = h(
        "button",
        {
            className:
                "absolute top-0 right-0 bottom-0 w-11 flex items-center justify-center text-muted hover:text-ink dark:hover:text-paper transition-colors cursor-pointer outline-none",
            onclick: () => {
                const isPassword = input.type === "password";
                input.type = isPassword ? "text" : "password";

                setIcon(toggleButton, isPassword ? "EyeOff" : "Eye", { size: 17 });
                toggleButton.blur();
            },
            type: "button",
        },
        initialIconSvg,
    );

    const inputGroup = h("div", { className: "relative mb-5 flex" }, input, toggleButton);

    container.append(errorMessage, inputGroup);

    return { container, errorMessage, input };
}

export function initPasswordPrompt(password: string, onVerifiedCallback: () => void): void {
    passwordModal.show(() => {
        const { container, errorMessage, input } = createPasswordForm(verifyPassword);

        function verifyPassword(): void {
            const enteredPassword = input.value;
            if (!enteredPassword) return;

            if (enteredPassword === password) {
                UIState.update("isPasswordVerified", true);
                passwordModal.close();
                onVerifiedCallback();
            } else {
                setVisible(errorMessage, true);
                input.value = "";
                input.focus();
            }
        }

        return {
            buttons: [
                {
                    onClick: verifyPassword,
                    text: "Unlock",
                    type: "primary",
                },
            ],
            closeOnBackdropClick: false,
            closeOnEscape: false,
            content: container,
            onOpen: () => input.focus(),
            title: "Locked",
        };
    });
}
