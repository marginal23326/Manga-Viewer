import { AppState } from '../core/AppState';
import Config from '../core/Config';

export function applyTheme(theme) {
    const htmlElement = document.documentElement;
    if (theme === 'dark') {
        htmlElement.classList.add('dark');
    } else {
        htmlElement.classList.remove('dark');
    }
    // Don't update AppState here, let the caller do it if needed,
    // or ensure AppState.update handles the theme key specifically.
    // AppState.update('theme', theme); // Avoid potential loops if called from AppState update
}

export function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    AppState.update('theme', newTheme); // Update state *after* applying
}

export function initTheme() {
    // Apply theme based on loaded AppState
    applyTheme(AppState.theme || Config.DEFAULT_THEME);
    console.log("Theme initialized:", AppState.theme);
}