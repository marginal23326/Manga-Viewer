import type { ConfiguredMangaSettings } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_SETTINGS: ConfiguredMangaSettings = {
    autoScrollEnabled: false,
    autoScrollSpeed: 50,
    collapseSpacing: false,
    imageFit: "original",
    navBarEnabled: true,
    progressBarEnabled: true,
    progressBarPosition: "bottom",
    progressBarStyle: "discrete",
    resumeMode: "ask",
    scrollAmount: 300,
    scrubberEnabled: true,
    spacingAmount: 30,
};

export const SettingsStore = createMangaScopedStore(DEFAULT_MANGA_SETTINGS, "mangaSettings");

export const CurrentSettings = SettingsStore.state;
