import { THEME_PREFERENCE_OPTIONS, type ThemePreference } from "@/types";
import { PersistState } from "@/state";
import { bind } from "@/core/binding";
import { createSegmentedControl } from "@/components/segmented-control";

const prefersDark = matchMedia("(prefers-color-scheme: dark)");
const isDark = (p: ThemePreference): boolean => p === "dark" || (p === "system" && prefersDark.matches);
const syncDom = (p: ThemePreference): void => void document.documentElement.classList.toggle("dark", isDark(p));

export function toggleTheme(): void {
    PersistState.update("themePreference", isDark(PersistState.themePreference) ? "light" : "dark");
}

export function createThemeSegmentedControl({ labels = false } = {}): HTMLDivElement {
    return createSegmentedControl({
        binding: bind(PersistState, "themePreference"),
        items: THEME_PREFERENCE_OPTIONS.map(({ icon, text, value }) => ({
            icon,
            text: labels ? text : undefined,
            value,
        })),
    });
}

export function initTheme(): void {
    PersistState.onChange("themePreference", syncDom, { immediate: true });
    prefersDark.addEventListener("change", () => {
        if (PersistState.themePreference === "system") syncDom("system");
    });
}
