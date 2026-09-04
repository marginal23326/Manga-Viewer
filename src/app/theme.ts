import { PersistState, UIState } from "@/state";
import type { ThemePreference } from "@/types";

// Listener for OS theme changes
const prefersDarkScheme = matchMedia("(prefers-color-scheme: dark)");

export function applyTheme(preference: ThemePreference): void {
    const isDark = preference === "dark" || (preference === "system" && prefersDarkScheme.matches);
    document.documentElement.classList.toggle("dark", isDark);
    UIState.update("themePreference", preference);
}

/** Handles system theme changes when theme preference is set to 'system'. */
function handleSystemThemeChange(): void {
    if (UIState.themePreference === "system") {
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
