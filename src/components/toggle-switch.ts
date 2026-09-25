import { h } from "@/core/dom-utils";

export function createToggleSwitch(
    checked: boolean,
    onChange: (checked: boolean) => void,
): { element: HTMLDivElement; setChecked: (checked: boolean) => void } {
    const input = h("input", {
        checked,
        className: "sr-only peer",
        onchange: () => onChange(input.checked),
        type: "checkbox",
    });
    const track = h("div", {
        className:
            "w-11 h-6 bg-ink/15 dark:bg-white/15 peer-checked:bg-accent dark:peer-checked:bg-accent-light rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 calm-transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-xs peer-checked:after:translate-x-5",
    });

    return {
        element: h("div", { className: "relative inline-flex items-center shrink-0" }, input, track),
        setChecked: (next: boolean) => {
            input.checked = next;
        },
    };
}
