import { PersistState } from "@/state";
import type { ThemePreference } from "@/types";
import { emitAppEvent } from "@/core/app-events";

// Listener for OS theme changes
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
let currentPreference: ThemePreference = "system";

export function applyTheme(preference: ThemePreference): void {
    currentPreference = preference;
    const isDark = preference === "dark" || (preference === "system" && prefersDarkScheme.matches);
    document.documentElement.classList.toggle("dark", isDark);
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
    const newTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(newTheme);
    PersistState.update("themePreference", newTheme);
}

export function initTheme(): void {
    applyTheme(PersistState.themePreference);
    prefersDarkScheme.addEventListener("change", handleSystemThemeChange);
}
