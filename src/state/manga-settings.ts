import type { ImageFit, ProgressBarPosition, ProgressBarStyle, ResumeMode } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

const typed = <T extends string>(value: T): T => value;

const DEFAULT_MANGA_SETTINGS = {
    autoScrollSpeed: 50,
    imageFit: typed<ImageFit>("original"),
    progressBarEnabled: true,
    progressBarPosition: typed<ProgressBarPosition>("bottom"),
    progressBarStyle: typed<ProgressBarStyle>("discrete"),
    resumeMode: typed<ResumeMode>("ask"),
    scrollAmount: 300,
    scrubberEnabled: true,
    spacingAmount: 30,
    toolbarEnabled: true,
};

export type MangaSettings = typeof DEFAULT_MANGA_SETTINGS;

export const CurrentSettings = createMangaScopedStore(DEFAULT_MANGA_SETTINGS, "settings", { hasGlobalScope: true });
