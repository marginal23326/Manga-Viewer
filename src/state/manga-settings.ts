import type { ImageFit, ProgressBarPosition, ProgressBarStyle, ResumeMode } from "@/types";
import { type RecordKind, readOverrides, recordKey, writeOverrides } from "./storage";
import { createState } from "@/core/create-state";

export const DEFAULT_MANGA_SETTINGS = {
    autoScrollSpeed: 50,
    imageFit: "original" satisfies ImageFit,
    progressBarEnabled: true,
    progressBarPosition: "bottom" satisfies ProgressBarPosition,
    progressBarStyle: "discrete" satisfies ProgressBarStyle,
    resumeMode: "ask" satisfies ResumeMode,
    scrollAmount: 300,
    scrubberEnabled: true,
    spacingAmount: 30,
    toolbarEnabled: true,
    zoomLevel: 1,
};

export type MangaSettings = typeof DEFAULT_MANGA_SETTINGS;

const KIND: RecordKind = "settings";

function resolve(mangaId: string | null): MangaSettings {
    return {
        ...DEFAULT_MANGA_SETTINGS,
        ...readOverrides<MangaSettings>(KIND),
        ...(mangaId === null ? {} : readOverrides<MangaSettings>(recordKey(KIND, mangaId))),
    };
}

let scope: string | null = null;

const targetKey = (): string => (scope === null ? KIND : recordKey(KIND, scope));

const state = createState(resolve(null), (key, value) => {
    const target = targetKey();
    writeOverrides(target, { ...readOverrides<MangaSettings>(target), [key]: value });
});

export const CurrentSettings = Object.assign(state, {
    restoreOverrides(snapshot: Partial<MangaSettings>): void {
        writeOverrides(targetKey(), snapshot);
        state.hydrate(resolve(scope));
    },
    setScope(mangaId: string | null): void {
        scope = mangaId;
        state.hydrate(resolve(mangaId));
    },
    snapshotOverrides: (): Partial<MangaSettings> => readOverrides<MangaSettings>(targetKey()),
});
