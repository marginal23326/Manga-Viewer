import { CurrentProgress, CurrentSettings } from "@/state";
import type { ResolvedMangaProgress, ResumeMode, ScrollAnchor } from "@/types";
import { createModal } from "@/components/modal";
import { h } from "@/core/dom-utils";

const resumeModal = createModal();

type SavedProgress = Pick<ResolvedMangaProgress, "currentChapter" | "scrollAnchor">;

export interface ResumeDecision {
    chapterIndex: number;
    restore?: ScrollAnchor;
}

function readSavedProgress(): SavedProgress {
    return {
        currentChapter: CurrentProgress.currentChapter,
        scrollAnchor: CurrentProgress.scrollAnchor,
    };
}

function showResumePrompt(progress: SavedProgress): Promise<ResumeDecision> {
    return new Promise((resolve) => {
        resumeModal.show(() => {
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

            const choose = (mode: ResumeMode, decision: ResumeDecision) => () => {
                if (rememberChoice.checked) CurrentSettings.update("resumeMode", mode);
                resumeModal.close();
                resolve(decision);
            };

            return {
                buttons: [
                    {
                        onClick: choose("restart", { chapterIndex: 0 }),
                        side: "left",
                        text: "Restart",
                        type: "secondary",
                    },
                    {
                        onClick: choose("always", {
                            chapterIndex: progress.currentChapter,
                            restore: progress.scrollAnchor,
                        }),
                        text: "Continue",
                        type: "primary",
                    },
                ],
                closeOnBackdropClick: false,
                closeOnEscape: false,
                content,
                title: "Continue where you left off?",
            };
        });
    });
}

export function resolveResumeChapter(): ResumeDecision | Promise<ResumeDecision> {
    const progress = readSavedProgress();
    const hasProgress =
        progress.currentChapter > 0 || progress.scrollAnchor.index > 0 || progress.scrollAnchor.pageFraction > 0;

    if (!hasProgress || CurrentSettings.resumeMode === "restart") return { chapterIndex: 0 };
    if (CurrentSettings.resumeMode === "always") {
        return { chapterIndex: progress.currentChapter, restore: progress.scrollAnchor };
    }
    return showResumePrompt(progress);
}

export function closeResumePrompt(): void {
    resumeModal.close();
}
