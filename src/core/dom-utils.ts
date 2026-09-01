export function $<T extends Element = HTMLElement>(selector: string, parent: ParentNode = document): T | null {
    return parent.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(selector: string, parent: ParentNode = document): T[] {
    return [...parent.querySelectorAll<T>(selector)];
}

function splitClassNames(classNames: string | undefined): string[] {
    return classNames?.split(" ").filter(Boolean) ?? [];
}

export function addClass(element: Element | null | undefined, classNames: string | undefined): void {
    if (element) element.classList.add(...splitClassNames(classNames));
}

export function removeClass(element: Element | null | undefined, classNames: string | undefined): void {
    if (element) element.classList.remove(...splitClassNames(classNames));
}

export function toggleClass(
    element: Element | null | undefined,
    classNames: string | undefined,
    force?: boolean,
): void {
    if (element) {
        for (const className of splitClassNames(classNames)) {
            element.classList.toggle(className, force);
        }
    }
}

export function setVisible(element: Element | null | undefined, visible: boolean): void {
    if (element) element.toggleAttribute("hidden", !visible);
}

export function setAttribute(element: Element | null | undefined, attributes: Record<string, string>): void {
    if (!element) return;
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value);
    }
}

export function setText(element: Element | null | undefined, text: string): void {
    if (element) element.textContent = text;
}

let bodyScrollLocks = 0;

export const bodyScroll = {
    lock(): void {
        if (++bodyScrollLocks === 1) document.body.style.overflow = "hidden";
    },
    unlock(): void {
        if (--bodyScrollLocks === 0) document.body.style.overflow = "";
    },
};

export function scrollToView(
    element: Element,
    behavior: ScrollBehavior = "smooth",
    block: ScrollLogicalPosition = "start",
): void {
    element.scrollIntoView({ behavior, block });
}

function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function animateScrollTo(startY: number, endY: number, duration = 300): void {
    let start: number | null = null;

    function step(timestamp: number): void {
        start ??= timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        window.scrollTo(0, startY + (endY - startY) * easeInOutCubic(percentage));
        if (progress < duration) {
            window.requestAnimationFrame(step);
        }
    }
    window.requestAnimationFrame(step);
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
            el.toggleAttribute(key, value);
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
    mangaList: "#manga-list",
    mangaSearchInput: "#manga-search-input",
    mangaSelectBtn: "#manga-select-btn",
    modalContainer: "#modal-container",
    navContainer: "#nav-container",
    progressBar: "#progress-bar",
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

// Queried fresh each time: ID lookups are cheap, and caching risked locking in a stale `null`.
export const DOM: Readonly<Record<DomKey, HTMLElement | null>> = new Proxy(Object.create(null), {
    get(_, key: DomKey) {
        return key in DOM_SELECTORS ? $(DOM_SELECTORS[key]) : undefined;
    },
});
