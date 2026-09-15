import { PersistState } from "@/state";
import type { ThemePreference } from "@/types";

const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = (p: ThemePreference): boolean => p === "dark" || (p === "system" && prefersDark.matches);
const syncDom = (p: ThemePreference): void => void document.documentElement.classList.toggle("dark", isDark(p));

export function toggleTheme(): void {
    PersistState.update("themePreference", isDark(PersistState.themePreference) ? "light" : "dark");
}

export function initTheme(): void {
    PersistState.onChange("themePreference", syncDom, { immediate: true });
    prefersDark.addEventListener("change", () => {
        if (PersistState.themePreference === "system") syncDom("system");
    });
}
