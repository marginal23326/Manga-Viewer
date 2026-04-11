# Manga Viewer

## Overview

Manga Viewer is an offline web application designed for seamless manga reading. It offers a continuous vertical viewing experience with manga management, intuitive navigation, keyboard shortcuts, and customizable settings. Features a brutalist design aesthetic.

## Features

- **Manga Management**: Add, edit, delete, and reorder multiple manga series on the homepage.
- **Chapter Support**: Organize images into chapters with automatic calculation.
- **Smooth Navigation**: Browse chapters and images using nav buttons, keyboard shortcuts, or scrubber.
- **Image Enhancement**: Zoom (in/out/reset), fullscreen mode, and lightbox for detailed viewing.
- **Scrubber**: Side-mounted scroll preview for quick navigation through the chapter.
- **Auto-Scroll**: Automatic scrolling with configurable speed.
- **Progress Tracking**: Visual progress bar showing scroll position.
- **Theme Switching**: Light/dark mode toggle.
- **Password Protection**: Optional password lock via environment variable.
- **Offline Functionality**: Runs locally without internet after initial load.

## Technologies Used

- HTML5
- CSS3 (Tailwind CSS v4, Google Fonts)
- JavaScript (ES6+)
- Vite (build tool)
- CryptoJS (password hashing)
- SortableJS (drag-and-drop reordering)
- Smoothscroll (smooth scrolling)
- Lucide (icons)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/marginal23326/Manga-Viewer.git
    ```
2. Navigate to the project directory:
    ```sh
    cd Manga-Viewer
    ```
3. Install dependencies:
    ```sh
    pnpm install
    ```
4. Start development server:
    ```sh
    pnpm dev
    ```
5. Build for production:
    ```sh
    pnpm build
    ```

## Configuration

Rename `.env.example` to `.env` and add your password hash:

```sh
VITE_PASSWORD_HASH=your_sha256_hash_here
```

To generate a SHA256 hash:

```sh
node -e "console.log(require('crypto').createHash('sha256').update('your_password').digest('hex'))"
```

**PowerShell (Windows):**

```powershell
Set-Content -Path $env:TEMP\pass.txt -Value 'your_password' -NoNewline; certutil -hashfile $env:TEMP\pass.txt SHA256; del $env:TEMP\pass.txt
```

## File Structure

```
Manga-Viewer/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── components/
│       ├── core/
│       ├── features/
│       ├── ui/
│       └── main.js
├── public/
├── README.md
└── LICENSE
```

## Usage Guide

### Homepage

- **Adding Manga**:
    1. Click "Add Manga"
    2. Fill in the details (Title, Description, Images Path, Total Images, Total Chapters)
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
- Toggle Fullscreen: Fullscreen button

### Sidebar

- **Zoom Controls**: `+`, `-`, `=`
- **Chapter Selection**: Dropdown menu
- **Settings**: Gear button for settings panel
- **Return to Home**: Home button

### Lightbox

- Open: Long-press on an image (200ms)
- Close: Click X or outside the image
- Navigate: `<` and `>` buttons
- Zoom: Mouse wheel
- Move: Click and drag

### Scrubber

- A vertical track on the right side
- Hover to see preview images
- Click/drag to jump to position

## Shortcuts

| Shortcut               | Action                        |
| ---------------------- | ----------------------------- |
| `→` or `d`             | Next Image                    |
| `←` or `a`             | Previous Image                |
| Click upper third      | Scroll Up                     |
| Click lower third      | Scroll Down                   |
| `Alt + →` or `Alt + d` | Next Chapter                  |
| `Alt + ←` or `Alt + a` | Previous Chapter              |
| `h`                    | First Chapter                 |
| `l`                    | Last Chapter                  |
| `+`                    | Zoom In                       |
| `-`                    | Zoom Out                      |
| `=`                    | Reset Zoom                    |
| `f`                    | Toggle Fullscreen             |
| `t`                    | Change Theme                  |
| `r`                    | Reload Chapter                |
| `s`                    | Toggle Auto Scroll            |
| `Shift + S`            | Open Settings                 |
| `Ctrl + b`             | Cycle Sidebar Mode            |
| `Esc`                  | Return to Home / Close Modals |

**Note**: Ensure no input field is focused for shortcuts to work.

## Settings

- **General**: Theme, view shortcuts, reset settings
- **Details**: Title, description, paths, totals (shown when viewing a manga)
- **Navigation**: Navigation bar, scroll amount, auto-scroll, scrubber
- **Display**: Image fit, spacing, progress bar

## Additional Notes

- **Image Naming**: Sequential naming (e.g., 1.jpg, 2.jpg); doesn't have to start at 1.
- **Supported Formats**: jpg, jpeg, png, webp, gif
- **Image Padding**: Supports patterns like 1, 01, 001 for zero-padding
- **Data Storage**: All manga data stored in localStorage

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
