# Manga Viewer

## Overview
This is a continuous vertical manga viewer website that provides a user-friendly interface to browse through pages/images automatically organized into chapters. It features a navigation bar, lightbox view, quick scroll, image zoom capabilities, shortcuts, and more—all designed to run locally.

## Features
- **Homepage**: Add different manga to the homepage and easily manage and switch between them.
- **Chapter Navigation**: Navigate through chapters using shortcuts, buttons, or a drop-down selector.
- **Image Zoom**: Zoom in, zoom out, and reset zoom levels on images.
- **Fullscreen Mode**: Toggle fullscreen for an immersive viewing experience.
- **Settings Management**: Configure image paths, total pages, total chapters, and theme settings.
- **Lightbox View**: Open images in a draggable, zoomable lightbox for detailed viewing.
- **Quick Scroll**: Quickly scroll through pages/images using a quick scroll bar on the right side with a mouse cursor.
- **Scroll Progress**: A visual progress bar to indicate scroll position within a chapter.

## Technologies Used
- HTML5
- CSS3 (Bootstrap 5, FontAwesome, Google Fonts)
- JavaScript (ES6)
- jQuery
- CryptoJS
- Sortable

## Setup Instructions
1. **Clone the repository**:
    ```sh
    git clone https://github.com/marginal23326/Manga-Viewer.git
    ```
3. **Go to the "Manga-Viewer" directory.** 
2. **Double-click the `index.html` file to open it in a browser.**

## File Structure
- **Manga-Viewer**/<br/>
┌── **index.html**:     Main HTML file containing the structure and layout<br/>
├── **styles.css**:     Custom styles for the manga viewer<br/>
├── **script.js**:      Main JavaScript file containing the functionality and logic<br/>
├── lib<br/>
├── scroll.svg<br/>
├── README.md<br/>
└── LICENSE<br/>

## Usage
### Homepage
- **Add Manga**: Click the `Add Manga` button to fill in the details about your manga.
- **Edit**: Click the edit button by hovering over the manga to edit any details.
- **Delete**:  Click the delete button by hovering over the manga to delete it.
- **Sort**: Click and hold on any manga to sort it differently.

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
- **Image Full Path**: Enter the full path to the images folder. _**Images have to be named sequentially, like 1.jpg, 2.jpg, and so on;**_ they can start at any index. Currently supports _jpg_, _jpeg_, _png_, _webp_, and _gif_.
- **Total Pages**: Enter the total number of pages/images.
- **Total Chapters**: Enter the total number of chapters all the pages/images totals to.
- **Theme**: Select between light and dark themes.
- **Save Settings**: Click `Save Changes` to apply the settings.

### Lightbox
- **Open Lightbox**: Long press on an image to open it in lightbox view.
- **Close Lightbox**: Click the close button (`×`) to exit lightbox view.
- **Drag Image**: Click and drag the image to move it within the lightbox.
- **Navigation**: Click the (`<`) or (`>`) button to go to the previous or next page/image. 
- **Zoom in Lightbox**: Use the mouse wheel to zoom in or out within the lightbox.

## Additional Notes
- **Scroll Progress**: The progress bar at the top of the page indicates the current scroll position within the chapter.
- **Keyboard Shortcuts**:
    - **Navigation**:
      - `→` or `d`: Next page
      - `←` or `a`: Previous page
      - `↑` or `w`: Scroll up
      - `↓` or `s`: Scroll down
      - `Alt + →` or `Alt + d`: Next chapter
      - `Alt + ←` or `Alt + a`: Previous chapter
      - `h`: Go to first chapter
      - `l`: Go to last chapter
    
    - **Zoom Control**:
      - `+`: Zoom in
      - `-`: Zoom out
      - `=`: Reset zoom to default
    
    - **View Options**:
      - `f`: Toggle fullscreen mode
      - `t`: Change theme
      - `r`: Reload current chapter
    
    - **Interface Control**:
      - `Shift + S`: Open settings
      - `Esc`: Return to homepage

**Note**: _Ensure that no input field is currently focused/selected for these shortcuts to work properly._

- **Click to Scroll**: As an alternative, click the lower half or the upper half of the screen to scroll down or up, respectively. 

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

Thanks for using the Manga Viewer! I hope it enhances the manga viewing experience.
