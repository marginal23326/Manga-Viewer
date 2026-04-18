import { DOM, toggleClass } from "./DOMUtils";
import { UIState } from "./State";

export function hideNav() {
    const navContainer = DOM.navContainer;
    if (!navContainer || !UIState.isNavVisible) return;

    UIState.update("isNavVisible", false);
    toggleClass(navContainer, "opacity-100 translate-y-0", false);
    toggleClass(navContainer, "opacity-0 -translate-y-[150%]", true);
}
