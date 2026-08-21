import type { Manga, ResumeMode } from "@/types";
import { type RestorePosition, loadChapterImages } from "./chapter";
import { getSettings, updateSettings } from "@/state";
import { hideModal, showModal } from "@/components/modal";
import { h } from "@/core/dom-utils";

const RESUME_MODAL_ID = "resume-progress-modal";

interface SavedProgress extends RestorePosition {
    chapter: number;
}

function resumeFrom(progress: SavedProgress): void {
    loadChapterImages(progress.chapter, { index: progress.index, offset: progress.offset });
}

function showResumePrompt(manga: Manga, progress: SavedProgress): void {
    const rememberChoice = h("input", { className: "cursor-pointer", type: "checkbox" });
    const rememberLabel = h(
        "label",
        { className: "flex items-center gap-2 text-sm text-ink/70 dark:text-paper/70 cursor-pointer select-none" },
        rememberChoice,
        "Don't ask again",
    );

    const content = h("div", { className: "space-y-4" });
    content.append(
        h(
            "p",
            { className: "text-sm text-ink/80 dark:text-paper/75" },
            `You stopped in chapter ${progress.chapter + 1}${progress.index > 0 ? `, page ${progress.index + 1}` : ""}.`,
        ),
        rememberLabel,
    );

    const choose = (mode: ResumeMode, act: () => void) => () => {
        if (rememberChoice.checked) updateSettings(manga.id, { resumeMode: mode });
        hideModal(RESUME_MODAL_ID);
        act();
    };

    showModal(RESUME_MODAL_ID, {
        buttons: [
            { onClick: choose("never", () => loadChapterImages(0)), text: "Start over", type: "secondary" },
            { onClick: choose("always", () => resumeFrom(progress)), text: "Continue", type: "primary" },
        ],
        closeOnBackdropClick: false,
        closeOnEscape: false,
        content,
        showCloseButton: false,
        size: "sm",
        title: "Continue where you left off?",
    });
}

export function resumeOrStartManga(manga: Manga): void {
    const settings = getSettings(manga.id);
    const progress: SavedProgress = {
        chapter: settings.currentChapter,
        index: settings.scrollIndex,
        offset: settings.scrollOffset,
    };
    const hasProgress = progress.chapter > 0 || progress.index > 0 || progress.offset > 0;

    if (!hasProgress || settings.resumeMode === "never") {
        loadChapterImages(0);
        return;
    }
    if (settings.resumeMode === "always") {
        resumeFrom(progress);
        return;
    }
    showResumePrompt(manga, progress);
}
