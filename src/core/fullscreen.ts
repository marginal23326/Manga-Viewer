export function toggleFullScreen(): void {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Error attempting to enable full-screen mode: ${message}`);
        });
        return;
    }

    void document.exitFullscreen();
}
