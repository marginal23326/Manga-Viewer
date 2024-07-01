# Manga Viewer

## Overview
This is a continuous vertical manga viewer designed to facilitate chapter navigation and image zoom capabilities. The website provides a user-friendly interface to browse through images automatically organized in chapters with a navigation container.

## Features
- **Homepage**: Add different manga to the homepage and easily switch between them.
- **Chapter Navigation**: Navigate through chapters using buttons or a dropdown selector.
- **Image Zoom**: Zoom in, zoom out, and reset zoom levels on images.
- **Fullscreen Mode**: Toggle fullscreen for an immersive viewing experience.
- **Settings Management**: Configure image paths, total pages, pages per chapter, and theme settings.
- **Lightbox View**: Open images in a draggable, zoomable lightbox for detailed viewing.
- **Scroll Progress**: Visual progress bar to indicate scroll position within a chapter.

## Technologies Used
- HTML5
- CSS3 (Bootstrap 4, FontAwesome, Google Fonts)
- JavaScript (ES6)
- jQuery
- CryptoJS

## Setup Instructions
1. **Clone the repository**:
    ```sh
    git clone https://github.com/marginal23326/Manga-Viewer.git
    cd Manga-Viewer
    ```

2. **Open `index.html` in a browser**:
    Simply open the `index.html` file in your preferred browser.

## File Structure
- **index.html**: Main HTML file containing the structure and layout.
- **styles.css**: Custom styles for the manga viewer.
- **script.js**: Main JavaScript file containing the functionality and logic.

## Usage

### Navigation
- **First Page**: Click the `<<` button to go to the first page.
- **Previous Page**: Click the `<` button to go to the previous page.
- **Next Page**: Click the `>` button to go to the next page.
- **Last Page**: Click the `>>` button to go to the last page.
- **Chapter Selector**: Use the dropdown to jump to a specific chapter.

### Zoom
- **Zoom In**: Click the `+` button to zoom in.
- **Zoom Out**: Click the `-` button to zoom out.
- **Reset Zoom**: Click the reset button to restore the original zoom level.

### Fullscreen
- **Toggle Fullscreen**: Click the fullscreen button to enter or exit fullscreen mode.

### Settings
- **Open Settings**: Click the settings button to open the settings modal.
- **Image Full Path**: Enter the full path to the images folder or select a folder. This assumes the images are named 1.jpg, 2.jpg, and so on.
- **Total Pages**: Enter the total number of pages.
- **Pages Per Chapter**: Enter the number of pages per chapter.
- **Theme**: Select between light and dark themes.
- **Save Settings**: Click `Save changes` to apply the settings.

### Lightbox
- **Open Lightbox**: Long press on an image to open it in lightbox view.
- **Close Lightbox**: Click the close button (`×`) to exit lightbox view.
- **Drag Image**: Click and drag the image to move it within the lightbox.
- **Zoom in Lightbox**: Use the mouse wheel to zoom in or out within the lightbox.

## Additional Notes
- **Scroll Progress**: The progress bar at the top of the page indicates the current scroll position within the chapter.
- **Keyboard Shortcuts**:
    - `d` or `Right Arrow`: Load next pages.
    - `a` or `Left Arrow`: Load previous pages.
    - `+` or `=`: Zoom in.
    - `-`: Zoom out.
    - `f`: Toggle fullscreen mode.
- **Click to Scroll**: You can click the lower half or the upper half to scroll down or up, respectively. 

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Thank you for using the Manga Viewer! I hope it enhances your manga viewing experience.
