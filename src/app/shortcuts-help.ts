import { SHORTCUTS, type Shortcut, formatKeyPart } from "./keymap";
import { createModal } from "@/components/modal";
import { h } from "@/core/dom-utils";

const shortcutsHelpModal = createModal();

function createFormattedKeys(displayKeys: readonly string[]): HTMLDivElement {
    const wrapper = h("div", { className: "flex flex-wrap items-center gap-1" });

    displayKeys.forEach((key, index) => {
        if (index > 0) {
            wrapper.append(h("span", { className: "mx-1 text-muted text-xs" }, "or"));
        }

        key.split("+").forEach((part, partIndex) => {
            if (partIndex > 0) {
                wrapper.append(h("span", { className: "text-faint text-xs" }, "+"));
            }
            wrapper.append(h("kbd", { className: "chip" }, formatKeyPart(part)));
        });
    });

    return wrapper;
}

function createShortcutRow(shortcut: Shortcut): HTMLDivElement {
    return h(
        "div",
        {
            className:
                "flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b last:border-b-0 gap-1.5",
        },
        h("div", { className: "text-[13.5px]" }, shortcut.action),
        createFormattedKeys(shortcut.keys),
    );
}

function createSection(title: string, shortcuts: readonly Shortcut[]): HTMLDivElement {
    return h(
        "div",
        { className: "mb-7 last:mb-0" },
        h("h3", { className: "field-label mb-1" }, title),
        h(
            "div",
            { className: "flex flex-col" },
            shortcuts.map((shortcut) => createShortcutRow(shortcut)),
        ),
    );
}

export function showShortcutsHelp(): void {
    shortcutsHelpModal.show(() => {
        const content = h(
            "div",
            {},
            createSection(
                "While reading",
                SHORTCUTS.filter((shortcut) => !shortcut.anywhere),
            ),
            createSection(
                "Anywhere",
                SHORTCUTS.filter((shortcut) => shortcut.anywhere),
            ),
            h(
                "p",
                { className: "mt-6 pt-4 border-t text-[12.5px] text-muted" },
                "Shortcuts pause while you type in a text field.",
            ),
        );

        return {
            buttons: [{ onClick: shortcutsHelpModal.close, text: "Done", type: "primary" }],
            closedby: "any",
            content,
            size: "xl",
            title: "Keyboard shortcuts",
        };
    });
}
