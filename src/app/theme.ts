import { PersistState } from "@/state";
import type { ThemePreference } from "@/types";
import { emitAppEvent } from "@/core/app-events";

// Listener for OS theme changes
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
let currentPreference: ThemePreference = "system";

export function applyTheme(preference: ThemePreference): void {
    currentPreference = preference;
    let actualTheme: "dark" | "light";

    if (preference === "system") {
        actualTheme = prefersDarkScheme.matches ? "dark" : "light";
    } else {
        actualTheme = preference;
    }

    document.documentElement.classList.toggle("dark", actualTheme === "dark");

    emitAppEvent("themeChanged", { themePreference: preference });
}

/** Handles system theme changes when theme preference is set to 'system'. */
function handleSystemThemeChange(): void {
    if (currentPreference === "system") {
        applyTheme("system");
    }
}

// Quick toggle between light/dark - forces explicit preference
export function toggleTheme(): void {
    const currentTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(newTheme);
    PersistState.update("themePreference", newTheme);
}

export function initTheme(): void {
    currentPreference = PersistState.themePreference;
    applyTheme(currentPreference);

    prefersDarkScheme.removeEventListener("change", handleSystemThemeChange);
    prefersDarkScheme.addEventListener("change", handleSystemThemeChange);
}
