export type ImageFit = "original" | "height" | "width";
export type ProgressBarPosition = "top" | "bottom";
export type ProgressBarStyle = "continuous" | "discrete";
export const THEME_PREFERENCES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const SIDEBAR_MODES = ["hover", "open", "closed"] as const;
export type SidebarMode = (typeof SIDEBAR_MODES)[number];

export const MANGA_SORT_ORDERS = ["custom", "title-asc", "title-desc", "chapters-asc", "chapters-desc"] as const;
export type MangaSortOrder = (typeof MANGA_SORT_ORDERS)[number];

export const CURRENT_VIEWS = ["homepage", "viewer"] as const;
export type CurrentView = (typeof CURRENT_VIEWS)[number];

export const RESUME_MODES = ["ask", "always", "never"] as const;
export type ResumeMode = (typeof RESUME_MODES)[number];

export interface ImagePattern {
    format: string;
    padLength: number;
}

export interface Manga {
    description: string;
    id: string;
    imagesFullPath: string;
    title: string;
    totalImages: number;
    userProvidedTotalChapters: number;
}

export type MangaFormData = Pick<
    Manga,
    "description" | "imagesFullPath" | "title" | "totalImages" | "userProvidedTotalChapters"
>;

export interface ConfiguredMangaSettings {
    autoScrollEnabled: boolean;
    autoScrollSpeed: number;
    collapseSpacing: boolean;
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

export interface TrackedMangaState {
    currentChapter?: number;
    imagePattern?: ImagePattern;
    scrollIndex?: number;
    scrollOffset?: number;
    zoomLevel?: number;
}

export type StoredMangaSettings = Partial<ConfiguredMangaSettings> & TrackedMangaState;

export type ResolvedMangaSettings = ConfiguredMangaSettings &
    Required<Omit<TrackedMangaState, "imagePattern">> &
    Pick<TrackedMangaState, "imagePattern">;

export type ResolvedSettings = ResolvedMangaSettings & { themePreference: ThemePreference };
