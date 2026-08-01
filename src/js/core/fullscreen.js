export function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((error) => {
            console.error(`Error attempting to enable full-screen mode: ${error.message}`);
        });
        return;
    }

    document.exitFullscreen();
}
