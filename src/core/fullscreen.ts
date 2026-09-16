export function toggleFullScreen(): void {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        return;
    }

    void document.exitFullscreen();
}
