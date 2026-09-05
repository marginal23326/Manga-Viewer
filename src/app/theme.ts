import { type OnChangeOptions, createState } from "@/core/create-state";
import { PersistState } from "@/state";
import type { ThemePreference } from "@/types";

// Listener for OS theme changes
const prefersDarkScheme = matchMedia("(prefers-color-scheme: dark)");

const AppliedTheme = createState<{ preference: ThemePreference }>({ preference: PersistState.themePreference });

function resolveIsDark(preference: ThemePreference): boolean {
    return preference === "dark" || (preference === "system" && prefersDarkScheme.matches);
}

export function applyTheme(preference: ThemePreference): void {
    document.documentElement.classList.toggle("dark", resolveIsDark(preference));
    AppliedTheme.hydrate({ preference });
}

/** Handles system theme changes when theme preference is set to 'system'. */
function handleSystemThemeChange(): void {
    if (AppliedTheme.preference === "system") {
        applyTheme("system");
    }
}

export function commitTheme(preference: ThemePreference): void {
    applyTheme(preference);
    PersistState.update("themePreference", preference);
}

export function toggleTheme(): void {
    const newTheme = resolveIsDark(AppliedTheme.preference) ? "light" : "dark";
    commitTheme(newTheme);
}

export function initTheme(): void {
    applyTheme(PersistState.themePreference);
    prefersDarkScheme.addEventListener("change", handleSystemThemeChange);
}

export function onThemeApplied(listener: (preference: ThemePreference) => void, options?: OnChangeOptions): void {
    AppliedTheme.onChange("preference", listener, options);
}
