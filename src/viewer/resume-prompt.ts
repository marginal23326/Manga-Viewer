import { CurrentSettings, type MangaProgress, hasProgress } from "@/state";
import type { ResumeMode, ScrollAnchor } from "@/types";
import { createModal } from "@/components/modal";
import { h } from "@/core/dom-utils";

const resumeModal = createModal();

interface ResumeDecision {
    chapterIndex: number;
    restore?: ScrollAnchor;
}

function showResumePrompt(progress: MangaProgress): Promise<ResumeDecision> {
    return new Promise((resolve) => {
        resumeModal.show(() => {
            const rememberChoice = h("input", { className: "size-4 cursor-pointer accent-accent", type: "checkbox" });
            const rememberLabel = h(
                "label",
                { className: "flex items-center gap-2.5 text-[13px] text-secondary cursor-pointer select-none" },
                rememberChoice,
                "Don't ask again",
            );

            const place =
                progress.scrollAnchor.index > 0
                    ? `Chapter ${progress.currentChapter + 1}, page ${progress.scrollAnchor.index + 1}`
                    : `Chapter ${progress.currentChapter + 1}`;
            const content = h("div", { className: "space-y-5" });
            content.append(
                h(
                    "p",
                    { className: "text-secondary leading-relaxed" },
                    "You left off at ",
                    h("span", { className: "font-semibold text-fg" }, place),
                    ".",
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
                        text: "Start over",
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
                closedby: "none",
                content,
                title: "Pick up where you left off?",
            };
        });
    });
}

export async function resolveResumeChapter(progress: MangaProgress): Promise<ResumeDecision> {
    if (!hasProgress(progress) || CurrentSettings.resumeMode === "restart") return { chapterIndex: 0 };
    if (CurrentSettings.resumeMode === "always") {
        return { chapterIndex: progress.currentChapter, restore: progress.scrollAnchor };
    }
    return await showResumePrompt(progress);
}

export const closeResumePrompt = resumeModal.close;
