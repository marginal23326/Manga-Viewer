// Constants and DOM Elements
const DOM = {
    pageContainer: document.getElementById('page-container'),
    pageRange: document.getElementById('page-range'),
    chapterSelector: document.getElementById('chapter-selector'),
    loadingSpinner: document.getElementById('loading-spinner'),
    navContainer: document.querySelector('.nav-container'),
    zoomInButton: document.getElementById('zoom-in-button'),
    zoomOutButton: document.getElementById('zoom-out-button')
};

const CONFIG = {
    pagesPerChapter: parseInt(localStorage.getItem('pagesPerChapter')),
    totalPages: parseInt(localStorage.getItem('totalPages')),
    get totalChapters() { return Math.ceil(this.totalPages / this.pagesPerChapter); }
};

// State Management
const State = {
    currentChapter: 0,
    currentZoom: parseFloat(localStorage.getItem('zoomLevel')) || 1,
    imageFullPath: localStorage.getItem('imageFullPath'),
    currentTheme: localStorage.getItem('theme') || 'dark',
    isChapterSelectorOpen: false,
    isNavVisible: false,
    scrollPosition: 0,
    lightbox: {
        element: null,
        img: null,
        isDragging: false,
        startX: 0,
        startY: 0,
        startTranslateX: 0,
        startTranslateY: 0,
        currentTranslateX: 0,
        currentTranslateY: 0,
        currentScale: 1
    }
};

// Utility Functions
const Util = {
    showSpinner: () => DOM.loadingSpinner.style.display = 'block',
    hideSpinner: () => DOM.loadingSpinner.style.display = 'none',
    saveToLocalStorage: (key, value) => localStorage.setItem(key, value),
    getFromLocalStorage: (key) => localStorage.getItem(key),
    updatePageRange: (start, end) => {
        DOM.pageRange.textContent = `Showing pages ${start} - ${end} of ${CONFIG.totalPages}`;
    },
    promptForPassword: () => {
        const password = prompt('Enter the password:');
        if (CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) === 'Your SHA256 hash of the password') {
            PageManager.loadCurrentPage();
            PageManager.loadPages();
        } else {
            alert('Incorrect password. Please try again.');
            Util.promptForPassword();
        }
    },
    getChapterBounds: (chapter = State.currentChapter) => ({
        start: chapter * CONFIG.pagesPerChapter,
        end: Math.min((chapter + 1) * CONFIG.pagesPerChapter, CONFIG.totalPages)
    })
};

Util.debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

// Page Management
const PageManager = {
    preloadImages: (startIndex, endIndex) => {
        for (let i = startIndex; i < endIndex; i++) {
            const img = new Image();
            img.src = `${State.imageFullPath}${i + 1}.jpg`;
        }
    },

    loadPages: () => {
        const { start, end } = Util.getChapterBounds();
        DOM.pageContainer.innerHTML = '';
        Util.showSpinner();
        let loadedImages = 0;
        const fragment = document.createDocumentFragment();
        
        for (let i = start; i < end; i++) {
            const img = document.createElement('img');
            img.src = `${State.imageFullPath}${i + 1}.jpg`;
            img.dataset.originalHeight = 0;
            img.loading = 'lazy';

            img.addEventListener('load', () => {
                loadedImages++;
                img.dataset.originalHeight = img.naturalHeight;
                if (loadedImages === end - start) {
                    Util.hideSpinner();
                    ZoomManager.applyZoom();
                    PageManager.restoreScrollPosition(); // Add this line to restore scroll position
                }
            });

            img.addEventListener('mousedown', (event) => LightboxManager.handleMouseDown(event, img));
            img.addEventListener('mouseup', LightboxManager.handleMouseUp);
            img.addEventListener('click', PageManager.handleClick);
            fragment.appendChild(img);
        }
        
        DOM.pageContainer.appendChild(fragment);
        Util.updatePageRange(start + 1, end);
        ChapterManager.updateChapterSelector();
        
        // Preload next chapter's images
        const nextChapterStart = end;
        const nextChapterEnd = Math.min(nextChapterStart + CONFIG.pagesPerChapter, CONFIG.totalPages);
        PageManager.preloadImages(nextChapterStart, nextChapterEnd);
    },
    
    changeChapter: (direction) => {
        const newChapter = State.currentChapter + direction;
        if (newChapter >= 0 && newChapter < CONFIG.totalChapters) {
            PageManager.saveScrollPosition(); // Add this line to save scroll position before changing chapter
            State.currentChapter = newChapter;
            State.scrollPosition = 0; // Reset scroll position for the new chapter
            PageManager.loadPages();
            PageManager.saveCurrentPage();
        }
    },
    
    loadNextPages: () => PageManager.changeChapter(1),
    loadPreviousPages: () => PageManager.changeChapter(-1),
    goToFirstPages: () => { State.currentChapter = 0; PageManager.loadPages(); PageManager.saveCurrentPage(); },
    goToLastPages: () => { State.currentChapter = CONFIG.totalChapters - 1; PageManager.loadPages(); PageManager.saveCurrentPage(); },
    
    saveCurrentPage: () => {
        Util.saveToLocalStorage('currentChapter', State.currentChapter);
        Util.saveToLocalStorage('scrollPosition', State.scrollPosition);
    },

    loadCurrentPage: () => {
        const savedPage = Util.getFromLocalStorage('currentChapter');
        const savedScrollPosition = Util.getFromLocalStorage('scrollPosition');
        if (savedPage !== null) {
            State.currentChapter = parseInt(savedPage);
        }
        if (savedScrollPosition !== null) {
            State.scrollPosition = parseInt(savedScrollPosition);
        }
    },

    saveScrollPosition: () => {
        State.scrollPosition = DOM.pageContainer.scrollTop;
        Util.saveToLocalStorage('scrollPosition', State.scrollPosition);
    },

    restoreScrollPosition: () => {
        DOM.pageContainer.scrollTop = State.scrollPosition;
    },

    handleClick: (event) => {
        const clickY = event.clientY;
        const viewportHeight = window.innerHeight;
        const scrollAmount = viewportHeight / 2;
        const duration = 200;
        
        let start = null;
        const container = DOM.pageContainer;
        const startPosition = container.scrollTop;
        let endPosition;

        if (clickY < viewportHeight / 2) {
            endPosition = startPosition - scrollAmount;
        } else {
            endPosition = startPosition + scrollAmount;
        }

        function step(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percentage = Math.min(progress / duration, 1);
            
            container.scrollTop = startPosition + (endPosition - startPosition) * easeInOutCubic(percentage);
            
            if (progress < duration) {
                window.requestAnimationFrame(step);
            }
        }

        window.requestAnimationFrame(step);
    }

};

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Zoom Management
const ZoomManager = {
    changeZoom: (factor) => {
        State.currentZoom = Math.max(0.5, State.currentZoom + factor);
        ZoomManager.applyZoom();
        Util.saveToLocalStorage('zoomLevel', State.currentZoom.toFixed(2));
    },
    
    zoomIn: () => ZoomManager.changeZoom(0.05),
    zoomOut: () => ZoomManager.changeZoom(-0.05),
    
    applyZoom: () => {
        const images = DOM.pageContainer.getElementsByTagName('img');
        for (let img of images) {
            const originalHeight = img.dataset.originalHeight;
            const newHeight = originalHeight * State.currentZoom;
            img.style.height = `${newHeight}px`;
        }
        
        // Update zoom level display
        const zoomPercentage = Math.round(State.currentZoom * 100);
        document.getElementById('zoom-level').textContent = `Zoom: ${zoomPercentage}%`;
        
        Util.saveToLocalStorage('zoomLevel', State.currentZoom.toFixed(2));
    },
    
    resetZoom: () => {
        State.currentZoom = 1;
        ZoomManager.applyZoom();
    }
};

// Chapter Management
const ChapterManager = {
    jumpToChapter: () => {
        const selectedChapter = parseInt(DOM.chapterSelector.value);
        if (selectedChapter >= 0 && selectedChapter < CONFIG.totalChapters) {
            State.currentChapter = selectedChapter;
            PageManager.loadPages();
            PageManager.saveCurrentPage();
            DOM.chapterSelector.blur();
        }
    },
    
    updateChapterSelector: () => {
        DOM.chapterSelector.innerHTML = Array.from({ length: CONFIG.totalChapters }, (_, i) => 
            `<option value="${i}" ${i === State.currentChapter ? 'selected' : ''}>Chapter ${i}</option>`
        ).join('');
    }
};

// Lightbox Management
const LightboxManager = {
    openLightbox: (imgSrc) => {
        if (!State.lightbox.element) {
            LightboxManager.createLightbox();
        }
        State.lightbox.img.src = imgSrc;
        State.lightbox.element.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },
    
    closeLightbox: () => {
        State.lightbox.element.style.display = 'none';
        State.lightbox.img.style.transform = 'translate(0, 0) scale(1)';
        State.lightbox.currentScale = 1;
        State.lightbox.currentTranslateX = 0;
        State.lightbox.currentTranslateY = 0;
        document.body.style.overflow = 'auto';
    },
    
    createLightbox: () => {
        State.lightbox.element = document.createElement('div');
        State.lightbox.element.id = 'lightbox';
        State.lightbox.element.addEventListener('click', LightboxManager.handleLightboxClick);
        
        State.lightbox.img = document.createElement('img');
        State.lightbox.img.addEventListener('mousedown', LightboxManager.startDrag);
        State.lightbox.img.addEventListener('mousemove', LightboxManager.drag);
        State.lightbox.img.addEventListener('mouseup', LightboxManager.endDrag);
        State.lightbox.img.addEventListener('mouseleave', LightboxManager.endDrag);
        State.lightbox.img.addEventListener('touchstart', LightboxManager.startDrag);
        State.lightbox.img.addEventListener('touchmove', LightboxManager.drag);
        State.lightbox.img.addEventListener('touchend', LightboxManager.endDrag);
        State.lightbox.img.addEventListener('wheel', LightboxManager.zoom);
        
        const closeButton = document.createElement('span');
        closeButton.id = 'lightbox-close';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', LightboxManager.closeLightbox);
        
        State.lightbox.element.appendChild(State.lightbox.img);
        State.lightbox.element.appendChild(closeButton);
        document.body.appendChild(State.lightbox.element);
    },
    
    handleMouseDown: (event, img) => {
        event.preventDefault();
        LightboxManager.clickTimeout = setTimeout(() => {
            LightboxManager.openLightbox(img.src);
        }, 200);
    },
    
    handleMouseUp: () => {
        clearTimeout(LightboxManager.clickTimeout);
    },
    
    handleLightboxClick: (event) => {
        if (event.target === State.lightbox.element) {
            LightboxManager.closeLightbox();
        }
    },
    
    startDrag: (event) => {
        event.preventDefault();
        if (event.target.tagName === 'IMG' && event.target.closest('#lightbox')) {
            State.lightbox.isDragging = true;
            State.lightbox.startX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
            State.lightbox.startY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;
            State.lightbox.startTranslateX = State.lightbox.currentTranslateX;
            State.lightbox.startTranslateY = State.lightbox.currentTranslateY;
            State.lightbox.img.style.cursor = 'grabbing';
        }
    },
    
    drag: (event) => {
        event.preventDefault();
        if (State.lightbox.isDragging) {
            const currentX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
            const currentY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;
            State.lightbox.currentTranslateX = State.lightbox.startTranslateX + currentX - State.lightbox.startX;
            State.lightbox.currentTranslateY = State.lightbox.startTranslateY + currentY - State.lightbox.startY;
            State.lightbox.img.style.transform = `translate(${State.lightbox.currentTranslateX}px, ${State.lightbox.currentTranslateY}px) scale(${State.lightbox.currentScale})`;
        }
    },
    
    endDrag: () => {
        if (State.lightbox.isDragging) {
            State.lightbox.isDragging = false;
            State.lightbox.img.style.cursor = 'grab';
        }
    },
    
    zoom: (event) => {
        event.preventDefault();

        const rect = State.lightbox.img.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) {
            return;
        }

        const scaleAmount = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = State.lightbox.currentScale * scaleAmount;

        if (newScale <= 0.95 || newScale > 20) {
            return;
        }

        const offsetX = (mouseX - rect.width / 2) * (scaleAmount - 1);
        const offsetY = (mouseY - rect.height / 2) * (scaleAmount - 1);

        State.lightbox.currentTranslateX -= offsetX;
        State.lightbox.currentTranslateY -= offsetY;
        State.lightbox.currentScale = newScale;

        State.lightbox.img.style.transform = `translate(${State.lightbox.currentTranslateX}px, ${State.lightbox.currentTranslateY}px) scale(${State.lightbox.currentScale})`;
    }
};

// Settings Management
const SettingsManager = {
    openSettings: () => {
        $('#settings-modal').modal('show');
        document.getElementById('image-full-path').value = State.imageFullPath;
        document.getElementById('pages-per-chapter').value = CONFIG.pagesPerChapter;
        document.getElementById('total-pages').value = CONFIG.totalPages;
    },
    
    saveSettings: () => {
        State.imageFullPath = document.getElementById('image-full-path').value;
        CONFIG.pagesPerChapter = parseInt(document.getElementById('pages-per-chapter').value);
        CONFIG.totalPages = parseInt(document.getElementById('total-pages').value);
        
        Util.saveToLocalStorage('imageFullPath', State.imageFullPath);
        Util.saveToLocalStorage('pagesPerChapter', CONFIG.pagesPerChapter);
        Util.saveToLocalStorage('totalPages', CONFIG.totalPages);
        
        ThemeManager.handleThemeChange();
        
        $('#settings-modal').modal('hide');
        PageManager.loadPages();
        ChapterManager.updateChapterSelector();
    },

    selectFolder: async () => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const files = await dirHandle.values();
            let filePath = '';
            for await (const entry of files) {
                if (entry.kind === 'file' && entry.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    filePath = entry.name;
                    break;
                }
            }
            if (filePath) {
                const path = `${dirHandle.name}/${filePath}`;
                document.getElementById('image-full-path').value = path.replace(/\/[^/]*$/, '/');
            } else {
                alert('No image files found in the selected directory.');
            }
        } catch (err) {
            console.error('Error selecting folder:', err);
            alert('Error selecting folder. Please try again or enter the full path manually.');
        }
    }
};

function updateProgressBar() {
    const container = DOM.pageContainer;
    const scrollPosition = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const scrollPercentage = (scrollPosition / scrollHeight) * 100;
    document.getElementById('chapter-progress-bar').style.width = `${scrollPercentage}%`;
}

DOM.pageContainer.addEventListener('scroll', updateProgressBar);

// Theme Management
const ThemeManager = {
    applyTheme: (theme) => {
        document.body.classList.toggle('dark-theme', theme === 'dark');
        Util.saveToLocalStorage('theme', theme);
    },
    
    loadTheme: () => {
        const savedTheme = Util.getFromLocalStorage('theme') || 'dark';
        ThemeManager.applyTheme(savedTheme);
        document.getElementById('theme-select').value = savedTheme;
    },
    
    handleThemeChange: () => {
        const selectedTheme = document.getElementById('theme-select').value;
        ThemeManager.applyTheme(selectedTheme);
    }
};

// Event Listeners
document.addEventListener('mousemove', (event) => {
    const visibilityRange = State.isNavVisible ? 70 : 50;
    const isInRange = window.innerHeight - event.clientY < visibilityRange;
    const shouldBeVisible = isInRange || State.isChapterSelectorOpen;

    if (shouldBeVisible !== State.isNavVisible) {
        State.isNavVisible = shouldBeVisible;
        DOM.navContainer.style.opacity = shouldBeVisible ? '1' : '0';
        DOM.navContainer.style.transform = shouldBeVisible ? 'translateY(0)' : 'translateY(100%)';
    }
});

DOM.chapterSelector.addEventListener('focus', () => {
    State.isChapterSelectorOpen = true;
});

DOM.chapterSelector.addEventListener('blur', () => {
    State.isChapterSelectorOpen = false;
});

document.addEventListener('keydown', (event) => {
    if (event.target.tagName === 'INPUT') return;
    
    switch (event.key) {
        case 'ArrowRight':
        case 'n':
            PageManager.loadNextPages();
            break;
        case 'ArrowLeft':
        case 'p':
            PageManager.loadPreviousPages();
            break;
        case '+':
        case '=':
            ZoomManager.zoomIn();
            break;
        case '-':
            ZoomManager.zoomOut();
            break;
        case 'f':
            window.toggleFullScreen();
            break;
        case 't':
            ThemeManager.toggleTheme();
            break;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.loadTheme();
    ZoomManager.applyZoom();
});

DOM.pageContainer.addEventListener('scroll', Util.debounce(() => {
    PageManager.saveScrollPosition();
}, 200)); // Debounce to avoid excessive saves

document.getElementById('theme-select').addEventListener('change', ThemeManager.handleThemeChange);

// Initialize the application
function initializeApp() {
    // Util.promptForPassword();
    // Load saved settings
    const savedPagesPerChapter = Util.getFromLocalStorage('pagesPerChapter');
    const savedTotalPages = Util.getFromLocalStorage('totalPages');
    if (savedPagesPerChapter) CONFIG.pagesPerChapter = parseInt(savedPagesPerChapter);
    if (savedTotalPages) CONFIG.totalPages = parseInt(savedTotalPages);
    ChapterManager.updateChapterSelector();

    // Add event listener for the select folder button
    document.getElementById('select-folder-btn').addEventListener('click', SettingsManager.selectFolder);
}

// Start the application
initializeApp();

// Expose necessary functions to the global scope
window.loadNextPages = PageManager.loadNextPages;
window.loadPreviousPages = PageManager.loadPreviousPages;
window.goToFirstPages = PageManager.goToFirstPages;
window.goToLastPages = PageManager.goToLastPages;
window.jumpToChapter = ChapterManager.jumpToChapter;
window.zoomIn = ZoomManager.zoomIn;
window.zoomOut = ZoomManager.zoomOut;
window.toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
};
window.openSettings = SettingsManager.openSettings;
window.saveSettings = SettingsManager.saveSettings;
window.toggleTheme = ThemeManager.toggleTheme;
