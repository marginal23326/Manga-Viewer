# Manga Viewer

## Overview

Manga Viewer is an offline web application designed for seamless manga reading. It offers a continuous vertical viewing experience with manga management, intuitive navigation, keyboard shortcuts, and customizable settings.

## Features

- **Manga Management**: Add, edit, delete, and reorder multiple manga series on the homepage.
- **Chapter Support**: Chapters are read directly from subfolders.
- **Smooth Navigation**: Browse chapters and images using nav buttons, keyboard shortcuts, or scrubber.
- **Image Enhancement**: Zoom (in/out/reset), fullscreen mode, and lightbox for detailed viewing.
- **Scrubber**: Side-mounted scroll preview for quick navigation through the chapter.
- **Auto-Scroll**: Automatic scrolling with configurable speed.
- **Progress Tracking**: Visual progress bar showing scroll position.
- **Theme Switching**: Light/dark mode toggle.
- **Password Protection**: Optional password lock via environment variable.
- **Offline Functionality**: Runs locally without internet after initial load.
- **Direct Folder Access**: Reads manga folders straight from disk (File System Access API) — no server or path juggling needed.

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

Rename `.env.example` to `.env` and add your password:

```sh
VITE_PASSWORD=your_password_here
```

**Note**: The password lock is a casual deterrent, not security — the password is visible in the built files.

## Usage Guide

### Homepage

- **Adding Manga**:
    1. Click "Add Manga"
    2. Fill in the title and description, and choose the series' folder (containing one subfolder per chapter)
    3. Click "Add manga"
- **Managing Manga**:
    - Edit: Hover over a cover and click the pencil button
    - Delete: Hover over a cover and click the trash button, or use **Select** to remove several at once
    - Continue reading: Covers show your chapter progress
    - Reorder: Click and drag manga cards to rearrange

### Reader Toolbar

A single toolbar slides down over the page when the pointer touches the top edge of the window. It also appears briefly when a manga opens, and stays up while you use it. Pin it open with the pin button or `Ctrl + b`.

- **Back to library**: Arrow button at the left, next to the manga title
- **Chapters**: Previous/next buttons around a searchable chapter list (`h` / `l` jump to the first/last chapter)
- **Page counter**: Current page out of the chapter total
- **Auto-scroll**: Play/pause button (`s`)
- **View options**: Zoom (type any value from 10 to 500%, or use `+`, `-`, `=`), image fit (original/width/height) and auto-scroll speed
- **Settings**: Gear button; theme lives here, and in the settings dialog on the library page

### Lightbox

- Open: Double-click on an image
- Close: Click X or outside the image
- Navigate: `<` and `>` buttons
- Zoom: Mouse wheel
- Move: Click and drag

### Scrubber

- A vertical track on the right side
- Hover to see preview images
- Click/drag to jump to position

## Shortcuts

| Shortcut               | Action                          |
| ---------------------- | ------------------------------- |
| `→` or `d`             | Next Image                      |
| `←` or `a`             | Previous Image                  |
| Click upper third      | Scroll Up                       |
| Click lower third      | Scroll Down                     |
| `Alt + →` or `Alt + d` | Next Chapter                    |
| `Alt + ←` or `Alt + a` | Previous Chapter                |
| `h`                    | First Chapter                   |
| `l`                    | Last Chapter                    |
| `+`                    | Zoom In                         |
| `-`                    | Zoom Out                        |
| `=`                    | Reset Zoom                      |
| `f`                    | Toggle Fullscreen               |
| `t`                    | Change Theme                    |
| `r`                    | Reload Manga                    |
| `s`                    | Toggle Auto Scroll              |
| `Shift + S`            | Open Settings                   |
| `Ctrl + b`             | Keep Toolbar Visible            |
| `Esc`                  | Back to Library / Close Dialogs |

**Note**: Ensure no input field is focused for shortcuts to work.

## Settings

- **General**: Theme, resume reading, view shortcuts, reset settings
- **Navigation**: Toolbar, scrubber, click scroll distance
- **Display**: Spacing, progress bar

## Additional Notes

- **Browser Support**: Folder access relies on the File System Access API, currently available in Chromium-based browsers only.

## File Structure

```
Manga-Viewer/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── core/
    ├── state/
    ├── components/
    ├── viewer/
    ├── library/
    ├── settings/
    ├── app/
    ├── css/
    │   └── styles.css
    ├── types.ts
    └── main.ts
```

## Technologies

- TypeScript
- Tailwind CSS
- Vite
- Lucide
- Oxlint + Oxfmt

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
