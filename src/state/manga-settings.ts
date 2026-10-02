import type { ConfiguredMangaSettings } from "@/types";
import { createMangaScopedStore } from "./manga-scoped-store";

export const DEFAULT_MANGA_SETTINGS: ConfiguredMangaSettings = {
    autoScrollSpeed: 50,
    imageFit: "original",
    progressBarEnabled: true,
    progressBarPosition: "bottom",
    progressBarStyle: "discrete",
    resumeMode: "ask",
    scrollAmount: 300,
    scrubberEnabled: true,
    spacingAmount: 30,
    toolbarEnabled: true,
};

export const CurrentSettings = createMangaScopedStore(DEFAULT_MANGA_SETTINGS, "settings", { hasGlobalScope: true });
