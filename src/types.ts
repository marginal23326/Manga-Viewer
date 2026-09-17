export const IMAGE_FIT_OPTIONS = [
    { text: "Original", value: "original" },
    { text: "Width", value: "width" },
    { text: "Height", value: "height" },
] as const;
export type ImageFit = (typeof IMAGE_FIT_OPTIONS)[number]["value"];

export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const SIDEBAR_MODES = ["hover", "open"] as const;
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

export const MANGA_SORT_ORDERS = ["custom", "title-asc", "title-desc", "chapters-asc", "chapters-desc"] as const;
export type MangaSortOrder = (typeof MANGA_SORT_ORDERS)[number];

export const CURRENT_VIEWS = ["homepage", "viewer"] as const;
export type CurrentView = (typeof CURRENT_VIEWS)[number];

export const RESUME_MODE_OPTIONS = [
    { text: "Ask", value: "ask" },
    { text: "Always continue", value: "always" },
    { text: "Restart", value: "never" },
] as const;
export type ResumeMode = (typeof RESUME_MODE_OPTIONS)[number]["value"];

export const PROGRESS_BAR_POSITION_OPTIONS = [
    { text: "Bottom", value: "bottom" },
    { text: "Top", value: "top" },
] as const;
type ProgressBarPosition = (typeof PROGRESS_BAR_POSITION_OPTIONS)[number]["value"];

export const PROGRESS_BAR_STYLE_OPTIONS = [
    { text: "Discrete", value: "discrete" },
    { text: "Continuous", value: "continuous" },
] as const;
type ProgressBarStyle = (typeof PROGRESS_BAR_STYLE_OPTIONS)[number]["value"];

export interface Manga {
    description: string;
    folderName: string;
    id: string;
    title: string;
    totalChapters: number;
}

export interface ConfiguredMangaSettings {
    autoScrollEnabled: boolean;
    autoScrollSpeed: number;
    imageFit: ImageFit;
    navBarEnabled: boolean;
    progressBarEnabled: boolean;
    progressBarPosition: ProgressBarPosition;
    progressBarStyle: ProgressBarStyle;
    resumeMode: ResumeMode;
    scrollAmount: number;
    scrubberEnabled: boolean;
    spacingAmount: number;
}

type KeysOfType<T extends object, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];
export type BooleanSettingKey = KeysOfType<ConfiguredMangaSettings, boolean>;
export type NumberSettingKey = KeysOfType<ConfiguredMangaSettings, number>;
export type StringSettingKey = KeysOfType<ConfiguredMangaSettings, string>;

export interface ScrollAnchor {
    index: number;
    pageFraction: number;
}

export interface ChapterContext {
    chapterIndex: number;
    mangaId: string;
    pageCount: number;
}

export interface ResolvedMangaProgress {
    currentChapter: number;
    scrollAnchor: ScrollAnchor;
    zoomLevel: number;
}
