export const IMAGE_FIT_OPTIONS = [
    { text: "Original", value: "original" },
    { text: "Width", value: "width" },
    { text: "Height", value: "height" },
] as const;
export type ImageFit = (typeof IMAGE_FIT_OPTIONS)[number]["value"];

export const THEME_PREFERENCE_OPTIONS = [
    { icon: "Sun", text: "Light", value: "light" },
    { icon: "Moon", text: "Dark", value: "dark" },
    { icon: "Laptop", text: "System", value: "system" },
] as const;
export type ThemePreference = (typeof THEME_PREFERENCE_OPTIONS)[number]["value"];

export const MANGA_SORT_FIELD_OPTIONS = [
    { text: "Custom", value: "custom" },
    { text: "Title", value: "title" },
    { text: "Chapters", value: "chapters" },
] as const;
export type MangaSortField = (typeof MANGA_SORT_FIELD_OPTIONS)[number]["value"];

export type MangaSortDir = "asc" | "desc";

export const RESUME_MODE_OPTIONS = [
    { text: "Ask", value: "ask" },
    { text: "Always continue", value: "always" },
    { text: "Restart", value: "restart" },
] as const;
export type ResumeMode = (typeof RESUME_MODE_OPTIONS)[number]["value"];

export const PROGRESS_BAR_POSITION_OPTIONS = [
    { text: "Bottom", value: "bottom" },
    { text: "Left", value: "left" },
] as const;
export type ProgressBarPosition = (typeof PROGRESS_BAR_POSITION_OPTIONS)[number]["value"];

export const PROGRESS_BAR_STYLE_OPTIONS = [
    { text: "Discrete", value: "discrete" },
    { text: "Continuous", value: "continuous" },
] as const;
export type ProgressBarStyle = (typeof PROGRESS_BAR_STYLE_OPTIONS)[number]["value"];

export interface Manga {
    description: string;
    folderName: string;
    id: string;
    title: string;
    totalChapters: number;
}

export interface ScrollAnchor {
    index: number;
    pageFraction: number;
}

export interface ChapterContext {
    chapterIndex: number;
    // Token of the navigation that opened it; tells a reload apart from the chapter it replaces.
    generation: number;
    mangaId: string;
    pageCount: number;
    start: ScrollAnchor;
}

export type ChapterRef = Pick<ChapterContext, "chapterIndex" | "mangaId">;
