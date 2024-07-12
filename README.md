# Manga Viewer

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [File Structure](#file-structure)
- [Usage Guide](#usage-guide)
  - [Homepage](#homepage)
  - [Navigation Bar](#navigation-bar)
  - [Sidebar](#sidebar)
  - [Lightbox](#lightbox)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Additional Notes](#additional-notes)
- [License](#license)

## Overview
Manga Viewer is a simple, offline application designed for seamless manga reading. It offers a continuous vertical viewing experience with manga management options, intuitive navigation, and customizable settings.

## Features
- **Manga Management**: Add, edit, and organize multiple manga series on the homepage.
- **Smooth Navigation**: Effortlessly browse through chapters and pages using various methods.
- **Image Enhancement**: Zoom, fullscreen, and lightbox functionalities for detailed viewing.
- **Customizable Settings**: Configure paths, chapter details, themes, and more to suit your preferences.
- **Progress Tracking**: Visual indicators for scroll position and chapter progress.
- **Offline Functionality**: Runs locally without the need for an internet connection.

## Technologies Used
- HTML5
- CSS3 (Bootstrap 5, FontAwesome, Google Fonts)
- JavaScript (ES6+)
- jQuery
- CryptoJS
- Sortable.js

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/marginal23326/Manga-Viewer.git
   ```
2. Navigate to the project directory:
   ```sh
   cd Manga-Viewer
   ```
3. Open `index.html` in your preferred web browser.

## File Structure
```
Manga-Viewer/
├── index.html
├── styles.css
├── script.js
├── lib/
│   └── (library files)
├── assets/
│   ├── scroll.svg
│   └── fullscreen.svg
├── README.md
└── LICENSE
```

## Usage Guide

### Homepage
- **Adding Manga**: 
  1. Click "Add Manga"
  2. Fill in the details (title, description, image path, total pages, chapters)
  3. Click "Save Manga"
- **Managing Manga**:
  - Edit: Hover over a manga and click the edit button
  - Delete: Hover over a manga and click the delete button
  - Reorder: Click and drag manga cards to rearrange

### Navigation Bar
- First Chapter: `<<`
- Previous Chapter: `<`
- Next Chapter: `>`
- Last Chapter: `>>`
- Toggle Fullscreen: ![fullscreen](https://raw.githubusercontent.com/marginal23326/Manga-Viewer/main/assets/fullscreen.svg)

### Sidebar
- **Zoom Controls**: 
  - Zoom In: `+`
  - Zoom Out: `-`
  - Reset Zoom: `⟲`
- **Chapter Selection**: Use the dropdown menu
- **Settings**: Click the ⚙ button to access:
  - General settings (theme, shortcuts)
  - Manga details
  - Navigation preferences
  - Display options
- **Return to Home**: Click the ⌂ (home) button to return to the homepage.

### Lightbox
- Open: Long-press on an image
- Close: Click `✖` or outside the image
- Navigate: Use `<` and `>` buttons
- Zoom: Use mouse wheel
- Move Image: Click and drag

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Next Page | `→` or `d` |
| Previous Page | `←` or `a` |
| Scroll Up | `↑` or `w` |
| Scroll Down | `↓` or `s` |
| Next Chapter | `Alt + →` or `Alt + d` |
| Previous Chapter | `Alt + ←` or `Alt + a` |
| First Chapter | `h` |
| Last Chapter | `l` |
| Zoom In | `+` |
| Zoom Out | `-` |
| Reset Zoom | `=` |
| Toggle Fullscreen | `f` |
| Change Theme | `t` |
| Reload Chapter | `r` |
| Open Settings | `Shift + S` |
| Return to Homepage | `Esc` |

**Note**: Ensure no input field is focused for shortcuts to work.

**Click to Scroll**: Click the lower half of the screen to scroll down, upper half to scroll up.

## Additional Notes
- **Image Naming**: Images must be named sequentially (e.g., 1.jpg, 2.jpg); _they don't have to start at 1_. Supported formats: jpg, jpeg, png, webp, gif.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Thank you for choosing Manga Viewer!
