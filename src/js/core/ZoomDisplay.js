export function updateZoomLevelDisplay(zoomLevel) {
    const display = document.getElementById("zoom-level-display");
    if (!display) return;

    display.textContent = `ZOOM: ${Math.round(zoomLevel * 100)
        .toString()
        .padStart(3, "0")}%`;
}
