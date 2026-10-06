export function requireElement<T extends Element = HTMLElement>(selector: string): T {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required element: ${selector}`);
    return element;
}

export function setVisible(element: Element, visible: boolean): void {
    element.toggleAttribute("hidden", !visible);
}

export function isOverlayOpen(): boolean {
    return document.querySelector("dialog[open]") !== null;
}

type HChild = Node | string | number | null | undefined | false | HChild[];

interface HProps extends Record<string, unknown> {
    className?: string;
    dataset?: Record<string, string | undefined>;
    id?: string;
    style?: Partial<CSSStyleDeclaration>;
}

function appendChildSafe(parent: Element, child: HChild): void {
    if (Array.isArray(child)) {
        for (const c of child) appendChildSafe(parent, c);
    } else if (typeof child === "string" || typeof child === "number") {
        parent.append(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
        parent.append(child);
    }
}

const H_SPECIAL_KEYS = new Set(["className", "id", "style", "dataset"]);

export function h<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props?: HProps,
    ...children: HChild[]
): HTMLElementTagNameMap[K];
export function h(tag: string, props?: HProps, ...children: HChild[]): HTMLElement;
export function h(tag: string, props: HProps = {}, ...children: HChild[]): HTMLElement {
    const el = document.createElement(tag);

    if (props.className) el.className = props.className;
    if (props.id) el.id = props.id;
    if (props.style) Object.assign(el.style, props.style);
    if (props.dataset) {
        for (const [key, value] of Object.entries(props.dataset)) {
            if (value !== undefined) el.dataset[key] = value;
        }
    }

    for (const [key, value] of Object.entries(props)) {
        if (H_SPECIAL_KEYS.has(key)) continue;

        if (key.startsWith("on") && typeof value === "function") {
            el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
        } else if (typeof value === "boolean") {
            el.toggleAttribute(key, value);
        } else if (typeof value === "string" || typeof value === "number") {
            el.setAttribute(key, String(value));
        }
    }

    for (const child of children) appendChildSafe(el, child);

    return el;
}
