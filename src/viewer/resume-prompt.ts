import { CurrentProgress, CurrentSettings } from "@/state";
import type { ResolvedMangaProgress, ResumeMode } from "@/types";
import { hideModal, showModal } from "@/components/modal";
import { forceLoadChapter } from "./chapter";
import { h } from "@/core/dom-utils";

const RESUME_MODAL_ID = "resume-progress-modal";

type SavedProgress = Pick<ResolvedMangaProgress, "currentChapter" | "scrollAnchor">;

function resumeFrom(progress: SavedProgress): void {
    forceLoadChapter(progress.currentChapter, progress.scrollAnchor);
}

function showResumePrompt(progress: SavedProgress): void {
    const rememberChoice = h("input", { className: "cursor-pointer", type: "checkbox" });
    const rememberLabel = h(
        "label",
        { className: "flex items-center gap-2 text-sm text-secondary cursor-pointer select-none" },
        rememberChoice,
        "Don't ask again",
    );

    const content = h("div", { className: "space-y-4" });
    content.append(
        h(
            "p",
            { className: "text-sm text-secondary" },
            `You stopped in chapter ${progress.currentChapter + 1}${progress.scrollAnchor.index > 0 ? `, page ${progress.scrollAnchor.index + 1}` : ""}.`,
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
                onClick: choose("never", () => forceLoadChapter(0)),
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
        currentChapter: CurrentProgress.currentChapter,
        scrollAnchor: CurrentProgress.scrollAnchor,
    };
    const hasProgress =
        progress.currentChapter > 0 || progress.scrollAnchor.index > 0 || progress.scrollAnchor.pageFraction > 0;

    if (!hasProgress || CurrentSettings.resumeMode === "never") {
        forceLoadChapter(0);
        return;
    }
    if (CurrentSettings.resumeMode === "always") {
        resumeFrom(progress);
        return;
    }
    showResumePrompt(progress);
}
