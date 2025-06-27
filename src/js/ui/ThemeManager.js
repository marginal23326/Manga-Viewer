import { State } from "../core/State";

// Listener for OS theme changes
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
let currentPreference = "system";

/**
 * Applies the theme based on the user's preference.
 * @param {'light' | 'dark' | 'system'} preference - The user's theme preference.
 */
export function applyTheme(preference) {
    currentPreference = preference; // Update tracked preference
    let actualTheme;

    if (preference === "system") {
        actualTheme = prefersDarkScheme.matches ? "dark" : "light";
    } else {
        actualTheme = preference;
    }

    const htmlElement = document.documentElement;
    if (actualTheme === "dark") {
        htmlElement.classList.add("dark");
    } else {
        htmlElement.classList.remove("dark");
    }

    document.dispatchEvent(new CustomEvent("theme-changed", {
        detail: { themePreference: preference }
    }));
}

/**
 * Handles system theme changes when theme preference is set to 'system'
 */
function handleSystemThemeChange() {
    if (currentPreference === "system") {
        applyTheme("system");
    }
}

// Quick toggle between light/dark - forces explicit preference
export function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(newTheme);
    State.update("themePreference", newTheme);
}

export function initTheme() {
    // Read the saved preference ('light', 'dark', 'system') or default to 'system'
    currentPreference = State.themePreference || "system";
    applyTheme(currentPreference);

    prefersDarkScheme.removeEventListener("change", handleSystemThemeChange);
    prefersDarkScheme.addEventListener("change", handleSystemThemeChange);
}
