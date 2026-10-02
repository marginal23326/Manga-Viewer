import type { Binding } from "@/core/binding";
import { h } from "@/core/dom-utils";

export function createToggleSwitch(
    binding: Binding<boolean>,
    { signal }: { signal?: AbortSignal } = {},
): HTMLDivElement {
    const input = h("input", {
        className: "sr-only peer",
        onchange: () => binding.set(input.checked),
        type: "checkbox",
    });
    binding.subscribe((checked) => {
        input.checked = checked;
    }, signal);

    const track = h("div", {
        className:
            "w-9 h-5 bg-fg/20 peer-checked:bg-accent rounded-full peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 calm-transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-transform after:duration-150 after:shadow-xs peer-checked:after:translate-x-4",
    });

    return h("div", { className: "relative inline-flex items-center shrink-0" }, input, track);
}
