export function $<T extends Element = HTMLElement>(selector: string, parent: ParentNode = document): T | null {
    return parent.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(selector: string, parent: ParentNode = document): T[] {
    return [...parent.querySelectorAll<T>(selector)];
}

export function showElement(element: HTMLElement | null | undefined, displayType = "block"): void {
    if (element) {
        element.classList.remove("hidden");
        element.style.display = displayType;
    }
}

export function hideElement(element: HTMLElement | null | undefined): void {
    if (element) {
        element.classList.add("hidden");
        element.style.display = "none";
    }
}

export function addClass(element: Element | null | undefined, classNames: string | undefined): void {
    if (element && classNames) {
        element.classList.add(...classNames.split(" ").filter(Boolean));
    }
}

export function removeClass(element: Element | null | undefined, classNames: string | undefined): void {
    if (element && classNames) {
        element.classList.remove(...classNames.split(" ").filter(Boolean));
    }
}

export function toggleClass(
    element: Element | null | undefined,
    classNames: string | undefined,
    force?: boolean,
): void {
    if (element && classNames) {
        for (const className of classNames.split(" ").filter(Boolean)) {
            element.classList.toggle(className, force);
        }
    }
}

export function setAttribute(element: Element | null | undefined, attributes: Record<string, string>): void {
    if (!element) return;
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
}

export function setDataAttribute(element: HTMLElement | null | undefined, key: string, value: string): void {
    if (element) element.dataset[key] = value;
}

export function getDataAttribute(element: HTMLElement | null | undefined, key: string): string | undefined {
    return element ? element.dataset[key] : undefined;
}

export function setText(element: Element | null | undefined, text: string): void {
    if (element) element.textContent = text;
}

export function setHtml(element: Element | null | undefined, html: string): void {
    if (element) element.innerHTML = html;
}

export function getValue(element: HTMLInputElement | HTMLTextAreaElement | null | undefined): string | undefined {
    return element ? element.value : undefined;
}

export function setValue(
    element: HTMLInputElement | HTMLTextAreaElement | null | undefined,
    value: string | number,
): void {
    if (element) element.value = String(value);
}

export function isChecked(element: HTMLInputElement | null | undefined): boolean {
    return element ? element.checked : false;
}

export function setChecked(element: HTMLInputElement | null | undefined, checked: boolean): void {
    if (element) element.checked = checked;
}

export type HChild = Node | string | number | null | undefined | false | HChild[];

export interface HProps extends Record<string, unknown> {
    className?: string;
    dataset?: Record<string, string | undefined>;
    htmlFor?: string;
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

    if (props.className) addClass(el, props.className);
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
        } else if (key === "htmlFor") {
            el.setAttribute("for", String(value));
        } else if (typeof value === "boolean") {
            Reflect.set(el, key, value);
        } else if (typeof value === "string" || typeof value === "number") {
            el.setAttribute(key, String(value));
        }
    }

    for (const child of children) appendChildSafe(el, child);

    return el;
}

const DOM_SELECTORS = {
    addMangaBtn: "#add-manga-btn",
    homepageContainer: "#homepage-container",
    imageContainer: "#image-container",
    lightbox: "#lightbox",
    loadingSpinner: "#loading-spinner",
    mainContent: "#main-content",
    mangaList: "#manga-list",
    mangaSearchInput: "#manga-search-input",
    mangaSelectBtn: "#manga-select-btn",
    modalContainer: "#modal-container",
    navContainer: "#nav-container",
    progressBar: "#progress-bar",
    scrubberIcon: "#scrubber-icon",
    scrubberMarkerActive: "#scrubber-marker-active",
    scrubberMarkerHover: "#scrubber-marker",
    scrubberParent: "#scrubber-parent",
    scrubberPreview: "#scrubber-preview div",
    scrubberTrack: "#scrubber",
    selectionActionsContainer: "#selection-actions",
    sidebar: "#sidebar",
    sidebarToggleContainer: "#sidebar-toggle-container",
    viewerContainer: "#viewer-container",
} as const;

type DomKey = keyof typeof DOM_SELECTORS;
type DomAccessors = Readonly<Record<DomKey, HTMLElement | null>>;

const domCache: Partial<Record<DomKey, HTMLElement | null>> = {};

export const DOM: DomAccessors = Object.defineProperties(
    {},
    Object.fromEntries(
        (Object.keys(DOM_SELECTORS) as DomKey[]).map((key) => [
            key,
            {
                enumerable: true,
                get: (): HTMLElement | null => (domCache[key] ??= $(DOM_SELECTORS[key])),
            } satisfies PropertyDescriptor,
        ]),
    ),
) as DomAccessors;
