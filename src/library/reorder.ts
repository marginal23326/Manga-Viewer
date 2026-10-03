export function enableReorder(
    container: HTMLElement,
    { canDrag, onReorder }: { canDrag: () => boolean; onReorder: () => void },
): void {
    let dragged: HTMLElement | null = null;
    let nextSibling: Element | null = null;

    function cardAt(target: EventTarget | null): HTMLElement | null {
        const card = (target as Element | null)?.closest<HTMLElement>("[data-id]");
        return card?.parentElement === container ? card : null;
    }

    container.addEventListener("mousedown", (event) => {
        const card = cardAt(event.target);
        if (card) card.draggable = canDrag() && !(event.target as Element).closest("button, a, input, .card-actions");
    });

    container.addEventListener("dragstart", (event) => {
        const card = cardAt(event.target);
        if (!card?.draggable) {
            event.preventDefault();
            return;
        }

        dragged = card;
        nextSibling = card.nextElementSibling;
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        requestAnimationFrame(() => card.classList.add("opacity-30"));
    });

    container.addEventListener("dragover", (event) => {
        if (!dragged) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";

        const target = cardAt(event.target);
        if (!target || target === dragged || target.getAnimations().length > 0) return;

        const isAfter = Boolean(dragged.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
        const before = new Map([...container.children].map((child) => [child, child.getBoundingClientRect()]));

        target[isAfter ? "after" : "before"](dragged);

        for (const [el, from] of before) {
            const to = el.getBoundingClientRect();
            if (el === dragged || (from.x === to.x && from.y === to.y)) continue;
            el.animate([{ transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)` }, { transform: "none" }], {
                duration: 180,
                easing: "ease-out",
            });
        }
    });

    container.addEventListener("dragend", (event) => {
        if (!dragged) return;
        dragged.classList.remove("opacity-30");
        dragged.draggable = false;

        if (event.dataTransfer?.dropEffect !== "none") onReorder();
        else if (nextSibling) nextSibling.before(dragged);
        else container.append(dragged);

        dragged = nextSibling = null;
    });
}
