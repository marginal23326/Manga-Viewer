import { CurrentProgress, CurrentSettings } from "@/state";
import type { ResumeMode, ScrollAnchor } from "@/types";
import { hideModal, showModal } from "@/components/modal";
import { h } from "@/core/dom-utils";
import { loadChapterImages } from "./chapter";

const RESUME_MODAL_ID = "resume-progress-modal";

interface SavedProgress {
    anchor: ScrollAnchor;
    chapter: number;
}

function resumeFrom(progress: SavedProgress): void {
    loadChapterImages(progress.chapter, progress.anchor);
}

function showResumePrompt(progress: SavedProgress): void {
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
            `You stopped in chapter ${progress.chapter + 1}${progress.anchor.index > 0 ? `, page ${progress.anchor.index + 1}` : ""}.`,
        ),
        rememberLabel,
    );

    const choose = (mode: ResumeMode, act: () => void) => () => {
        if (rememberChoice.checked) CurrentSettings.update("resumeMode", mode);
        hideModal(RESUME_MODAL_ID);
        act();
    };

    showModal(RESUME_MODAL_ID, {
        buttons: [
            {
                onClick: choose("never", () => loadChapterImages(0)),
                side: "left",
                text: "Restart",
                type: "secondary",
            },
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

export function resumeOrStartManga(): void {
    const progress: SavedProgress = {
        anchor: CurrentProgress.scrollAnchor,
        chapter: CurrentProgress.currentChapter,
    };
    const hasProgress = progress.chapter > 0 || progress.anchor.index > 0 || progress.anchor.offset > 0;

    if (!hasProgress || CurrentSettings.resumeMode === "never") {
        loadChapterImages(0);
        return;
    }
    if (CurrentSettings.resumeMode === "always") {
        resumeFrom(progress);
        return;
    }
    showResumePrompt(progress);
}
