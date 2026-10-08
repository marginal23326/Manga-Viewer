import { type MangaProgress, createProgressState } from "./manga-progress";
import { type State, createState } from "@/core/create-state";
import type { ChapterContext } from "@/types";
import { CurrentSettings } from "./manga-settings";

export interface MangaSession {
    readonly mangaId: string;
    readonly progress: State<MangaProgress>;
}

interface ViewerStateShape {
    activeChapter: ChapterContext | null;
    autoScroll: boolean;
    lightboxIndex: number | null;
    session: MangaSession | null;
    visibleImageIndex: number;
}

export const ViewerState = createState<ViewerStateShape>({
    activeChapter: null,
    autoScroll: false,
    lightboxIndex: null,
    session: null,
    visibleImageIndex: 0,
});

export function openSession(mangaId: string): MangaSession {
    const current = ViewerState.session;
    if (current?.mangaId === mangaId) return current;

    CurrentSettings.setScope(mangaId);
    const session: MangaSession = { mangaId, progress: createProgressState(mangaId) };
    ViewerState.update("session", session);
    return session;
}

export function closeSession(): void {
    CurrentSettings.setScope(null);
    ViewerState.update("session", null);
}
