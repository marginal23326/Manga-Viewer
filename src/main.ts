import "./css/styles.css";

import { h, requireElement } from "@/core/dom-utils";
import { createHomePage } from "@/library/home-page-ui";
import { createViewer } from "@/viewer/viewer";
import { initPasswordPrompt } from "@/app/password-prompt";
import { initShortcuts } from "@/app/shortcuts";
import { initTheme } from "@/app/theme";
import { startRouter } from "@/app/view-router";

history.scrollRestoration = "manual";

function mountApp(): void {
    const viewer = createViewer();
    const library = createHomePage();

    initShortcuts();
    requireElement("#app").replaceChildren(h("div", { className: "grow", id: "main-content" }, library, viewer));
    startRouter();
}

initTheme();

const password = import.meta.env.VITE_PASSWORD || "";
if (password) {
    initPasswordPrompt(password, mountApp);
} else {
    mountApp();
}
