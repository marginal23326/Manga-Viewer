// Constants and DOM Elements
const DOM = (() => {
    const elements = {};
    return {
        get: (id) => {
            if (!elements[id]) {
                elements[id] = document.getElementById(id);
            }
            return elements[id];
        },
    };
})();

// State Management
const AppState = {
    currentManga: null,
    theme: JSON.parse(localStorage.getItem("theme")) || "dark",
    isChapterSelectorOpen: false,
    isNavVisible: false,
    mangaList: JSON.parse(localStorage.getItem("mangaList")) || [],
    mangaSettings: JSON.parse(localStorage.getItem("mangaSettings")) || {},
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
        currentScale: 1,
    },
    update(key, value) {
        this[key] = value;
        localStorage.setItem(key, JSON.stringify(value));
    },
};

// Utility Functions
class Utils {
    static toggleSpinner(show) {
        DOM.get("loading-spinner").style.display = show ? "block" : "none";
    }

    static updatePageRange(start, end) {
        if (!AppState.currentManga) return;
        DOM.get("page-range").textContent = `Showing pages ${start} - ${end} of ${AppState.currentManga.totalPages}`;
    }

    static debounce(func, delay) {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    static promptForPassword(passwordHash = "") {
        if (!passwordHash) {
            initializeApp();
            return;
        }

        const modal = DOM.get('password-modal');
        const input = DOM.get('password-input');
        const submitBtn = DOM.get('submit-password');
        const errorMsg = DOM.get('password-error');
        const toggleBtn = DOM.get('toggle-password');
        
        Utils.toggleSpinner(false);
        modal.style.display = 'block';
        input.focus();
        
        toggleBtn.addEventListener('click', function() {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.querySelector('.eye-icon').style.backgroundImage = type === 'password' 
                ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'%3E%3C/path%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E\")"
                : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'%3E%3C/path%3E%3Cline x1='1' y1='1' x2='23' y2='23'%3E%3C/line%3E%3C/svg%3E\")";
        });
        
        submitBtn.onclick = function() {
            const password = input.value;
            if (CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) === passwordHash) {
                modal.style.display = 'none';
                initializeApp();
            } else {
                errorMsg.style.display = 'block';
                input.value = '';
                input.focus();
            }
        };
        
        input.onkeyup = function(event) {
            if (event.key === "Enter") {
                submitBtn.click();
            }
        };
    }

    static getChapterBounds(manga, chapter) {
        return {
            start: chapter * manga.pagesPerChapter,
            end: Math.min((chapter + 1) * manga.pagesPerChapter, manga.totalPages),
        };
    }

    static saveMangaSettings(mangaId, settings) {
        AppState.mangaSettings[mangaId] = settings;
        AppState.update("mangaSettings", AppState.mangaSettings);
    }

    static loadMangaSettings(mangaId) {
        return (
            AppState.mangaSettings[mangaId] || {
                currentChapter: 0,
                scrollPosition: 0,
                zoomLevel: 1,
            }
        );
    }

    static withCurrentManga(callback) {
        if (!AppState.currentManga) return null;
        const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
        return callback(mangaSettings);
    }
}

// Manga Management
const MangaManager = {
    createMangaCard: (manga) => {
        if (!manga || typeof manga !== "object" || !manga.id) {
            console.error("Invalid manga object:", manga);
            return null;
        }
        const card = document.createElement("div");
        card.className = "col-md-4 col-sm-6";
        card.innerHTML = `
            <div class="card manga-card" data-manga-id="${manga.id}">
                <img src="${manga.imagesFullPath}1.jpg" class="card-img-top" alt="${manga.title}">
                <div class="card-body">
                    <h5 class="card-title">${manga.title}</h5>
                    <p class="card-text chapter-info">
                        <small class="text-muted">
                            Chapters: ${manga.userProvidedTotalChapters} 
                        </small>
                    </p>
                    <p class="card-text">${manga.description}</p>
                </div>
                <button class="edit-btn"><i class="fas fa-edit"></i></button>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `;
        return card;
    },

    renderMangaList: () => {
        const mangaListElement = DOM.get("manga-list");
        mangaListElement.innerHTML = "";
        AppState.mangaList.forEach((manga, id) => {
            const card = MangaManager.createMangaCard(manga);
            mangaListElement.appendChild(card);
        });
        MangaManager.initSortable();
    },

    initSortable: () => {
        new Sortable(DOM.get("manga-list"), {
            animation: 150,
            onEnd: () => {
                const newOrder = Array.from(DOM.get("manga-list").children).map((card) => AppState.mangaList.find((manga) => manga.id === parseInt(card.querySelector(".manga-card").dataset.mangaId)));
                AppState.update("mangaList", newOrder);
                MangaManager.saveMangaList();
            },
        });
    },

    addManga: (manga) => {
        manga.id = Date.now();
        AppState.mangaList.push(manga);
        MangaManager.saveMangaList();
        MangaManager.renderMangaList();
        ChapterManager.updateChapterSelector();
    },

    editManga: (id, updatedManga) => {
        const index = AppState.mangaList.findIndex((manga) => manga.id === id);
        if (index !== -1) {
            AppState.mangaList[index] = { ...AppState.mangaList[index], ...updatedManga };
            MangaManager.saveMangaList();
            MangaManager.renderMangaList();
            if (AppState.currentManga && AppState.currentManga.id === id) {
                AppState.update("currentManga", AppState.mangaList[index]);
                ChapterManager.updateChapterSelector();
                PageManager.loadPages();
            }
        }
    },

    deleteManga: (id) => {
        AppState.mangaList = AppState.mangaList.filter((manga) => manga.id !== id);
        MangaManager.saveMangaList();
        MangaManager.renderMangaList();
        if (AppState.currentManga && AppState.currentManga.id === id) {
            AppState.update("currentManga", null);
            ChapterManager.updateChapterSelector();
            PageManager.loadPages();
        }
    },

    saveMangaList: () => {
        localStorage.setItem("mangaList", JSON.stringify(AppState.mangaList));
    },

    loadManga: (manga) => {
        if (AppState.currentManga) {
            PageManager.saveScrollPosition();
        }
        AppState.update("currentManga", manga);
        showViewer();
        PageManager.loadPages();
        ChapterManager.updateChapterSelector();
        ZoomManager.applyZoom();
    },
};

function toggleProgressBarVisibility(visible) {
    const progressBar = DOM.get("chapter-progress-bar");
    if (progressBar) {
        progressBar.style.display = visible ? "block" : "none";
    }
}

function clearMangaState() {
    if (AppState.currentManga) {
        PageManager.saveScrollPosition();
    }
    AppState.update("currentManga", null);
    DOM.get("chapter-progress-bar").style.width = "0%";
    DOM.get("page-container").scrollTop = 0;
}

const AppStateMachine = {
    currentState: "homepage",
    transitions: {
        homepage: ["viewer"],
        viewer: ["homepage"],
    },
    transition(to) {
        if (this.transitions[this.currentState].includes(to)) {
            this.currentState = to;
            this.updateUI();
        } else {
            console.error(`Invalid state transition from ${this.currentState} to ${to}`);
        }
    },
    updateUI() {
        const homepageContainer = DOM.get("homepage-container");
        const pageContainer = DOM.get("page-container");
        const navContainer = DOM.get("nav-container");
        switch (this.currentState) {
            case "homepage":
                if (homepageContainer) homepageContainer.style.display = "block";
                if (pageContainer) pageContainer.style.display = "none";
                if (navContainer) navContainer.style.display = "none";
                toggleProgressBarVisibility(false);
                ScrubberManager.removeEventListeners();
                break;
            case "viewer":
                if (homepageContainer) homepageContainer.style.display = "none";
                if (pageContainer) pageContainer.style.display = "inline-flex";
                if (navContainer) navContainer.style.display = "flex";
                toggleProgressBarVisibility(true);
                break;
        }
    },
};

function showHomepage() {
    if (AppStateMachine.currentState !== "homepage") {
        if (AppState.currentManga) {
            PageManager.saveScrollPosition();
        }
        AppState.update("currentManga", null);
        AppStateMachine.transition("homepage");
        triggerAnimations();
    }
}

function triggerAnimations() {
    document.body.classList.remove('animate-title');
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('animate-title');
        });
    });
}

function showViewer() {
    if (AppStateMachine.currentState !== "viewer") {
        AppStateMachine.transition("viewer");
    }
}

function backToHomepage() {
    clearMangaState();
    showHomepage();
}

const lazyLoadImages = () => {
    const images = document.querySelectorAll("img[data-src]");
    const options = {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
    };

    const loadImage = (image) => {
        image.src = image.dataset.src;
        image.removeAttribute("data-src");
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                loadImage(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, options);

    images.forEach((img) => observer.observe(img));
};

// Page Management
const PageManager = {
    loadPages: () => {
        if (!AppState.currentManga) {
            console.error("No manga selected");
            return;
        }
        const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
        const { start, end } = Utils.getChapterBounds(AppState.currentManga, mangaSettings.currentChapter);
        DOM.get("page-container").innerHTML = "";
        Utils.toggleSpinner(true);
        let loadedImages = 0;
        const fragment = document.createDocumentFragment();
        const totalImagesToLoad = end - start;

        let lastSuccessfulFormat = "jpg";
        const formatPriority = ["jpg", "jpeg", "png", "webp", "gif"];

        const loadImage = (index) => {
            const img = document.createElement("img");
            img.dataset.originalHeight = 0;
            img.loading = "lazy";

            const tryLoadImage = (formats) => {
                if (formats.length === 0) {
                    console.error(`Failed to load image for index: ${index}`);
                    onImageLoad();
                    return;
                }

                const format = formats.shift();
                img.src = `${AppState.currentManga.imagesFullPath}${index}.${format}`;

                img.onload = () => {
                    img.dataset.originalHeight = img.naturalHeight;
                    lastSuccessfulFormat = format;
                    onImageLoad();
                };

                img.onerror = () => {
                    tryLoadImage(formats);
                };
            };

            const onImageLoad = () => {
                loadedImages++;
                if (loadedImages === totalImagesToLoad) {
                    Utils.toggleSpinner(false);
                    PageManager.restoreScrollPosition();
                    SettingsManager.applySettings();
                    ZoomManager.applyZoom();
                }
            };

            img.addEventListener("mousedown", (event) => LightboxManager.handleMouseDown(event, img));
            img.addEventListener("mouseup", LightboxManager.handleMouseUp);
            img.addEventListener("click", PageManager.handleClick);
            fragment.appendChild(img);

            const formatsToTry = [lastSuccessfulFormat, ...formatPriority.filter((f) => f !== lastSuccessfulFormat)];
            tryLoadImage(formatsToTry);
        };

        for (let i = start; i < end; i++) {
            loadImage(i + 1);
        }

        DOM.get("page-container").appendChild(fragment);
        lazyLoadImages();
        Utils.updatePageRange(start + 1, end);
        ChapterManager.updateChapterSelector();
        ScrubberManager.init();
        ScrubberManager.setupScrubberPreview();
        ScrubberManager.updateVisiblePage(0);

        // Preload next chapter's images
        const nextChapterStart = end;
        const nextChapterEnd = Math.min(nextChapterStart + AppState.currentManga.pagesPerChapter, AppState.currentManga.totalPages);
        PageManager.preloadImages(nextChapterStart, nextChapterEnd);
    },

    preloadImages: (startIndex, endIndex) => {
        if (!AppState.currentManga) return;
        for (let i = startIndex; i < endIndex; i++) {
            const img = new Image();
            img.src = `${AppState.currentManga.imagesFullPath}${i + 1}.jpg`;
        }
    },

    changeChapter: (direction) => {
        Utils.withCurrentManga((mangaSettings) => {
            const newChapter = mangaSettings.currentChapter + direction;
            if (newChapter >= 0 && newChapter < AppState.currentManga.totalChapters) {
                mangaSettings.currentChapter = newChapter;
                mangaSettings.scrollPosition = 0;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
                PageManager.loadPages();
            }
        });
    },

    loadNextChapter: () => PageManager.changeChapter(1),
    loadPreviousChapter: () => PageManager.changeChapter(-1),
    goToFirstChapter: () => {
        Utils.withCurrentManga((mangaSettings) => {
            mangaSettings.currentChapter = 0;
            Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
            PageManager.loadPages();
            PageManager.saveScrollPosition();
        });
    },

    goToLastChapter: () => {
        Utils.withCurrentManga((mangaSettings) => {
            mangaSettings.currentChapter = AppState.currentManga.totalChapters - 1;
            Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
            PageManager.loadPages();
            PageManager.saveScrollPosition();
        });
    },

    loadCurrentPage: () => {
        Utils.withCurrentManga((mangaSettings) => {
            ChapterManager.updateChapterSelector();
            PageManager.loadPages();
            PageManager.restoreScrollPosition();
        });
    },

    restoreScrollPosition: () => {
        const smoothScroll = (element, targetPosition, duration = 1000) => {
            const startPosition = element.scrollTop;
            const distance = targetPosition - startPosition;
            let startTime = null;

            const animation = (currentTime) => {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const run = easeOutCubic(timeElapsed, startPosition, distance, duration);
                element.scrollTop = run;
                if (timeElapsed < duration) requestAnimationFrame(animation);
            };

            // Easing function
            const easeOutCubic = (t, b, c, d) => {
                t /= d;
                t--;
                return c * (t * t * t + 1) + b;
            };

            requestAnimationFrame(animation);
        };

        Utils.withCurrentManga((mangaSettings) => {
            setTimeout(() => {
                const pageContainer = DOM.get("page-container");
                const targetPosition = mangaSettings.scrollPosition || 0;
                smoothScroll(pageContainer, targetPosition);
            }, 1500);
        });
    },

    saveScrollPosition: () => {
        Utils.withCurrentManga((mangaSettings) => {
            mangaSettings.scrollPosition = DOM.get("page-container").scrollTop;
            Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
        });
    },

    handleClick: (event) => {
        const clickY = event.clientY;
        const viewportHeight = window.innerHeight;
        const scrollAmount = viewportHeight / 2;
        const duration = 200;

        let start = null;
        const container = DOM.get("page-container");
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
    },

    handleScroll: Utils.debounce(() => {
        ScrubberManager.updateActiveMarker();
        PageManager.saveScrollPosition();
    }, 100),
};

// Scrubber Management
const ScrubberManager = {
    scrubberImages: [],
    state: {
        screenHeight: 0,
        previewHeight: 0,
        markerHeight: 0,
        visiblePageIndex: 0,
        previewPageIndex: 0,
        isMouseOverScrubber: false,
    },

    init: () => {
        const scrubberContainer = DOM.get("scrubber-container");
        const scrubber = DOM.get("scrubber");
        const scrubberPreview = DOM.get("scrubber-preview");
        const scrubberMarker = DOM.get("scrubber-marker");
        const scrubberMarkerActive = DOM.get("scrubber-marker-active");

        ScrubberManager.addEventListeners();
    },

    manageEventListeners: (element, method) => {
        element[method]("mouseenter", ScrubberManager.handleScrubberEnter);
        element[method]("mouseleave", ScrubberManager.handleScrubberLeave);
        element[method]("mousemove", ScrubberManager.handleScrubberMove);
        element[method]("click", ScrubberManager.handleScrubberClick);
    },

    addEventListeners: () => {
        const scrubber = DOM.get("scrubber");
        ScrubberManager.manageEventListeners(scrubber, 'addEventListener');
        DOM.get("page-container").addEventListener("scroll", Utils.debounce(ScrubberManager.updateActiveMarker, 100));
    },

    removeEventListeners: () => {
        const scrubber = DOM.get("scrubber");
        ScrubberManager.manageEventListeners(scrubber, 'removeEventListener');
        DOM.get("page-container").removeEventListener("scroll", Utils.debounce(ScrubberManager.updateActiveMarker, 100));
        DOM.get("scrubber-container").style.opacity = "0";
    },

    isMouseOverScrubber: () => {
        return ScrubberManager.state.isMouseOverScrubber;
    },

    hideNavBar: () => {
        AppState.update("isNavVisible", false);
        const navContainer = DOM.get("nav-container");
        if (navContainer) {
            navContainer.style.opacity = "0";
            navContainer.style.transform = "translateY(100%)";
        }
    },

    setupScrubberPreview: () => {
        const scrubberPreview = DOM.get("scrubber-preview");
        scrubberPreview.innerHTML = ""; // Clear existing previews
        ScrubberManager.scrubberImages = Utils.withCurrentManga((mangaSettings) => {
            const { start, end } = Utils.getChapterBounds(AppState.currentManga, mangaSettings.currentChapter);
            return Array.from({ length: end - start }, (_, i) => {
                const img = document.createElement("img");
                img.loading = "lazy";
                img.classList.add("scrubber-preview-image");
                img.dataset.index = `${i}`;
                img.src = `${AppState.currentManga.imagesFullPath}${start + i + 1}.jpg`;
                return img;
            });
        });
        scrubberPreview.append(...ScrubberManager.scrubberImages);
    },

    handleScrubberEnter: (event) => {
        ScrubberManager.state.isMouseOverScrubber = true;
        const scrubberContainer = DOM.get("scrubber-container");
        ScrubberManager.state.screenHeight = window.innerHeight;
        ScrubberManager.state.previewHeight = DOM.get("scrubber-preview").offsetHeight;
        ScrubberManager.state.markerHeight = DOM.get("scrubber-marker").offsetHeight;
        ScrubberManager.setScrubberMarkerActive(ScrubberManager.state.visiblePageIndex);
        scrubberContainer.style.opacity = "1";
        ScrubberManager.hideNavBar();
    },

    handleScrubberLeave: (event) => {
        ScrubberManager.state.isMouseOverScrubber = false;
        DOM.get("scrubber-container").style.opacity = "0";
        setTimeout(() => {
            if (!ScrubberManager.isMouseOverScrubber()) {
                AppState.update("isNavVisible", false);
            }
        }, 500);
    },

    handleScrubberMove: (event) => {
        const cursorY = event.clientY;
        const cursorYRatio = cursorY / ScrubberManager.state.screenHeight;
        ScrubberManager.state.previewPageIndex = Math.floor(cursorYRatio * ScrubberManager.scrubberImages.length);

        ScrubberManager.setMarkerPosition(cursorY);
        ScrubberManager.setMarkerText(`${ScrubberManager.state.previewPageIndex + 1}`);
        ScrubberManager.setPreviewScroll(cursorY);
        ScrubberManager.highlightHoveredImage();
    },

    handleScrubberClick: (event) => {
        const cursorYRatio = event.clientY / ScrubberManager.state.screenHeight;
        const imageIndex = Math.floor(cursorYRatio * ScrubberManager.scrubberImages.length);
        ScrubberManager.goToPage(imageIndex);
    },

    setMarkerPosition: (cursorY) => {
        const markerYPos = Math.max(0, Math.min(cursorY - ScrubberManager.state.markerHeight / 2, ScrubberManager.state.screenHeight - ScrubberManager.state.markerHeight));
        DOM.get("scrubber-marker").style.transform = `translateY(${markerYPos}px)`;
    },

    setMarkerText: (text) => {
        DOM.get("scrubber-marker").innerText = text;
    },

    setPreviewScroll: (cursorY) => {
        const cursorYRatio = cursorY / ScrubberManager.state.screenHeight;
        DOM.get("scrubber-preview").style.transform = `translateY(${-cursorYRatio * ScrubberManager.state.previewHeight + cursorY}px)`;
    },

    setScrubberMarkerActive: (activeIndex) => {
        const totalPages = ScrubberManager.scrubberImages.length;
        const activeY = (activeIndex / (totalPages - 1)) * (ScrubberManager.state.screenHeight - ScrubberManager.state.markerHeight);
        DOM.get("scrubber-marker-active").style.transform = `translateY(${activeY}px)`;
        DOM.get("scrubber-marker-active").innerText = `${activeIndex + 1}`;
    },

    highlightHoveredImage: () => {
        ScrubberManager.scrubberImages.forEach((img, index) => {
            if (index === ScrubberManager.state.previewPageIndex) {
                img.classList.add("hovered");
            } else {
                img.classList.remove("hovered");
            }
        });
    },

    updateVisiblePage: (pageIndex) => {
        if (pageIndex !== ScrubberManager.state.visiblePageIndex) {
            ScrubberManager.state.visiblePageIndex = pageIndex;
            ScrubberManager.setScrubberMarkerActive(pageIndex);
        }
    },

    navigateScrubber: (delta) => {
        const newIndex = Math.max(0, Math.min(ScrubberManager.state.visiblePageIndex + delta, ScrubberManager.scrubberImages.length - 1));
        ScrubberManager.goToPage(newIndex);
    },

    goToPage: (pageIndex) => {
        pageIndex = Math.max(0, Math.min(pageIndex, ScrubberManager.scrubberImages.length - 1));
        const pageContainer = DOM.get("page-container");
        const images = pageContainer.querySelectorAll("img");
        if (images[pageIndex]) {
            images[pageIndex].scrollIntoView({ behavior: "smooth", block: "start" });
            ScrubberManager.updateVisiblePage(pageIndex);
        }
    },

    updateActiveMarker: () => {
        const pageContainer = DOM.get("page-container");
        const images = pageContainer.querySelectorAll("img");
        const containerRect = pageContainer.getBoundingClientRect();
        let visiblePageIndex = 0;

        for (let i = 0; i < images.length; i++) {
            const imgRect = images[i].getBoundingClientRect();
            if (imgRect.top >= containerRect.top - imgRect.height / 2) {
                visiblePageIndex = i;
                break;
            }
        }

        ScrubberManager.updateVisiblePage(visiblePageIndex);
    },
};


function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Zoom Management
const ZoomManager = {
    adjustZoom: (newZoomLevel) => {
        Utils.withCurrentManga((mangaSettings) => {
            const container = DOM.get("page-container");
            const oldZoomLevel = mangaSettings.zoomLevel;
            
            mangaSettings.zoomLevel = Number(newZoomLevel.toFixed(2));
            
            const viewportHeight = container.clientHeight;
            const oldScrollBottom = container.scrollTop + viewportHeight;
            const oldContentHeight = container.scrollHeight;
            const relativePosition = container.scrollTop / (oldContentHeight - viewportHeight);

            Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
            ZoomManager.applyZoom();

            const newContentHeight = container.scrollHeight;
            const newScrollTop = relativePosition * (newContentHeight - viewportHeight);
            
            container.scrollTop = Math.round(newScrollTop);
        });
    },
    changeZoom: (factor) => {
        Utils.withCurrentManga((mangaSettings) => {
            const newZoomLevel = Math.max(0.5, mangaSettings.zoomLevel + factor);
            ZoomManager.adjustZoom(newZoomLevel);
        });
    },
    zoomIn: () => ZoomManager.changeZoom(0.05),
    zoomOut: () => ZoomManager.changeZoom(-0.05),
    resetZoom: () => ZoomManager.adjustZoom(1),
    applyZoom: () => {
        Utils.withCurrentManga((mangaSettings) => {
            const images = DOM.get("page-container").getElementsByTagName("img");
            const imageFit = mangaSettings.imageFit;
            
            for (let img of images) {
                const originalHeight = parseFloat(img.dataset.originalHeight);
                const newHeight = originalHeight * mangaSettings.zoomLevel;
                
                switch (imageFit) {
                    case "height":
                        img.style.height = "100%";
                        img.style.width = "auto";
                        break;
                    case "width":
                        img.style.width = "100%";
                        img.style.height = "auto";
                        break;
                    case "both":
                        img.style.width = "100%";
                        img.style.height = "100%";
                        img.style.objectFit = "contain";
                        break;
                    default:
                        img.style.height = `${Math.round(newHeight)}px`;
                        img.style.width = "auto";
                }
            }
            const zoomPercentage = Math.round(mangaSettings.zoomLevel * 100);
            DOM.get("zoom-level").textContent = `Zoom: ${zoomPercentage}%`;
        });
    },
};

// Chapter Management
const ChapterManager = {
    jumpToChapter: () => {
        if (!AppState.currentManga) return;
        const selectedChapter = parseInt(DOM.get("chapter-selector").value);
        if (selectedChapter >= 0 && selectedChapter < AppState.currentManga.totalChapters) {
            const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
            mangaSettings.currentChapter = selectedChapter;
            mangaSettings.scrollPosition = 0;
            Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
            PageManager.loadPages();
            DOM.get("chapter-selector").blur();
            DOM.get("chapter-progress-bar").style.width = "0%";
            DOM.get("page-container").scrollTop = 0;
        }
    },

    updateChapterSelector: () => {
        Utils.withCurrentManga((mangaSettings) => {
            DOM.get("chapter-selector").innerHTML = Array.from({ length: AppState.currentManga.totalChapters }, (_, i) => `<option value="${i}" ${i === mangaSettings.currentChapter ? "selected" : ""}>Chapter ${i}</option>`).join("");
        });
    },
};

// Lightbox Management
const LightboxManager = {
    currentImageIndex: 0,
    openLightbox: (imgSrc) => {
        if (!AppState.lightbox.element) {
            LightboxManager.createLightbox();
        }
        const images = Array.from(DOM.get("page-container").getElementsByTagName("img"));
        LightboxManager.currentImageIndex = images.findIndex((img) => img.src === imgSrc);
        LightboxManager.loadCurrentImage();
        AppState.lightbox.element.style.display = "flex";
        document.body.style.overflow = "hidden";
        LightboxManager.updateButtonVisibility();
    },

    loadCurrentImage: () => {
        const images = Array.from(DOM.get("page-container").getElementsByTagName("img"));
        if (LightboxManager.currentImageIndex >= 0 && LightboxManager.currentImageIndex < images.length) {
            const currentImg = images[LightboxManager.currentImageIndex];
            if (currentImg.complete && currentImg.naturalHeight !== 0) {
                AppState.lightbox.img.src = currentImg.src;
            } else {
                LightboxManager.skipToNextValidImage(1);
            }
        }
    },

    skipToNextValidImage: (direction) => {
        const images = Array.from(DOM.get("page-container").getElementsByTagName("img"));
        let nextIndex = LightboxManager.currentImageIndex + direction;
        while (nextIndex >= 0 && nextIndex < images.length) {
            const img = images[nextIndex];
            if (img.complete && img.naturalHeight !== 0) {
                LightboxManager.currentImageIndex = nextIndex;
                AppState.lightbox.img.src = img.src;
                LightboxManager.updateButtonVisibility();
                return;
            }
            nextIndex += direction;
        }
        LightboxManager.closeLightbox();
    },

    closeLightbox: () => {
        AppState.lightbox.element.style.display = "none";
        AppState.lightbox.img.style.transform = "translate(0, 0) scale(1)";
        AppState.lightbox.currentScale = 1;
        AppState.lightbox.currentTranslateX = 0;
        AppState.lightbox.currentTranslateY = 0;
        document.body.style.overflow = "auto";
    },

    createLightbox: () => {
        AppState.lightbox.element = document.createElement("div");
        AppState.lightbox.element.id = "lightbox";
        AppState.lightbox.element.addEventListener("click", LightboxManager.handleLightboxClick);

        AppState.lightbox.img = document.createElement("img");
        AppState.lightbox.img.addEventListener("mousedown", LightboxManager.startDrag);
        AppState.lightbox.img.addEventListener("mousemove", LightboxManager.drag);
        AppState.lightbox.img.addEventListener("mouseup", LightboxManager.endDrag);
        AppState.lightbox.img.addEventListener("mouseleave", LightboxManager.endDrag);
        AppState.lightbox.img.addEventListener("touchstart", LightboxManager.startDrag);
        AppState.lightbox.img.addEventListener("touchmove", LightboxManager.drag);
        AppState.lightbox.img.addEventListener("touchend", LightboxManager.endDrag);
        AppState.lightbox.img.addEventListener("wheel", LightboxManager.zoom);

        const closeButton = document.createElement("span");
        closeButton.id = "lightbox-close";
        closeButton.innerHTML = "&times;";
        closeButton.addEventListener("click", LightboxManager.closeLightbox);

        AppState.lightbox.prevButton = document.createElement("span");
        AppState.lightbox.prevButton.id = "lightbox-prev";
        AppState.lightbox.prevButton.innerHTML = "&#10094;";
        AppState.lightbox.prevButton.addEventListener("click", LightboxManager.prevImage);

        AppState.lightbox.nextButton = document.createElement("span");
        AppState.lightbox.nextButton.id = "lightbox-next";
        AppState.lightbox.nextButton.innerHTML = "&#10095;";
        AppState.lightbox.nextButton.addEventListener("click", LightboxManager.nextImage);

        AppState.lightbox.element.appendChild(AppState.lightbox.img);
        AppState.lightbox.element.appendChild(closeButton);
        AppState.lightbox.element.appendChild(AppState.lightbox.prevButton);
        AppState.lightbox.element.appendChild(AppState.lightbox.nextButton);
        document.body.appendChild(AppState.lightbox.element);
    },

    prevImage: () => {
        LightboxManager.skipToNextValidImage(-1);
        ScrubberManager.navigateScrubber(-1);
        LightboxManager.resetZoomAndPosition();
    },

    nextImage: () => {
        LightboxManager.skipToNextValidImage(1);
        ScrubberManager.navigateScrubber(1);
        LightboxManager.resetZoomAndPosition();
    },

    updateButtonVisibility: () => {
        const images = Array.from(DOM.get("page-container").getElementsByTagName("img"));
        AppState.lightbox.prevButton.style.display = LightboxManager.currentImageIndex > 0 ? "inline-flex" : "none";
        AppState.lightbox.nextButton.style.display = LightboxManager.currentImageIndex < images.length - 1 ? "inline-flex" : "none";
    },

    resetZoomAndPosition: () => {
        AppState.lightbox.img.style.transform = "translate(0, 0) scale(1)";
        AppState.lightbox.currentScale = 1;
        AppState.lightbox.currentTranslateX = 0;
        AppState.lightbox.currentTranslateY = 0;
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
        if (event.target === AppState.lightbox.element) {
            LightboxManager.closeLightbox();
        }
    },

    startDrag: (event) => {
        event.preventDefault();
        if (event.target.tagName === "IMG" && event.target.closest("#lightbox")) {
            AppState.lightbox.isDragging = true;
            AppState.lightbox.startX = event.type.startsWith("touch") ? event.touches[0].clientX : event.clientX;
            AppState.lightbox.startY = event.type.startsWith("touch") ? event.touches[0].clientY : event.clientY;
            AppState.lightbox.startTranslateX = AppState.lightbox.currentTranslateX;
            AppState.lightbox.startTranslateY = AppState.lightbox.currentTranslateY;
            AppState.lightbox.img.style.cursor = "grabbing";
        }
    },

    drag: (event) => {
        event.preventDefault();
        if (AppState.lightbox.isDragging) {
            const currentX = event.type.startsWith("touch") ? event.touches[0].clientX : event.clientX;
            const currentY = event.type.startsWith("touch") ? event.touches[0].clientY : event.clientY;
            AppState.lightbox.currentTranslateX = AppState.lightbox.startTranslateX + currentX - AppState.lightbox.startX;
            AppState.lightbox.currentTranslateY = AppState.lightbox.startTranslateY + currentY - AppState.lightbox.startY;
            AppState.lightbox.img.style.transform = `translate(${AppState.lightbox.currentTranslateX}px, ${AppState.lightbox.currentTranslateY}px) scale(${AppState.lightbox.currentScale})`;
        }
    },

    endDrag: () => {
        if (AppState.lightbox.isDragging) {
            AppState.lightbox.isDragging = false;
            AppState.lightbox.img.style.cursor = "grab";
        }
    },

    zoom: (event) => {
        event.preventDefault();

        const rect = AppState.lightbox.img.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) {
            return;
        }

        const scaleAmount = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = AppState.lightbox.currentScale * scaleAmount;

        if (newScale <= 0.95 || newScale > 40) {
            return;
        }

        const offsetX = (mouseX - rect.width / 2) * (scaleAmount - 1);
        const offsetY = (mouseY - rect.height / 2) * (scaleAmount - 1);

        AppState.lightbox.currentTranslateX -= offsetX;
        AppState.lightbox.currentTranslateY -= offsetY;
        AppState.lightbox.currentScale = newScale;

        AppState.lightbox.img.style.transform = `translate(${AppState.lightbox.currentTranslateX}px, ${AppState.lightbox.currentTranslateY}px) scale(${AppState.lightbox.currentScale})`;
    },
};

// Settings Management
const SettingsManager = {
    openSettings: () => {
        if (!AppState.currentManga) {
            alert("Please select a manga first before opening settings.");
            return;
        }
        $("#settings-modal").modal("show");
        const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
        DOM.get("images-full-path").value = AppState.currentManga.imagesFullPath;
        DOM.get("total-chapters").value = AppState.currentManga.userProvidedTotalChapters;
        DOM.get("total-pages").value = AppState.currentManga.totalPages;
        DOM.get("theme-select").value = AppState.theme;
        
        // Load new settings
        DOM.get("scroll-amount").value = mangaSettings.scrollAmount || 200;
        DOM.get("image-fit").value = mangaSettings.imageFit || "original";
        DOM.get("collapse-spacing").checked = mangaSettings.collapseSpacing || false;
        DOM.get("spacing-amount").value = mangaSettings.spacingAmount || 30;
        DOM.get("background-color").value = mangaSettings.backgroundColor || getComputedStyle(document.querySelector(`.${AppState.theme}-theme`)).getPropertyValue('--bg-color').trim();
    },

    saveSettings: () => {
        if (!AppState.currentManga) return;
        
        const updatedManga = {
            imagesFullPath: DOM.get("images-full-path").value,
            totalPages: parseInt(DOM.get("total-pages").value),
            userProvidedTotalChapters: parseInt(DOM.get("total-chapters").value),
        };
        
        updatedManga.pagesPerChapter = Math.floor(updatedManga.totalPages / updatedManga.userProvidedTotalChapters);
        updatedManga.totalChapters = Math.ceil(updatedManga.totalPages / updatedManga.pagesPerChapter);
        
        MangaManager.editManga(AppState.currentManga.id, updatedManga);
        
        // Save new settings
        const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
        mangaSettings.scrollAmount = parseInt(DOM.get("scroll-amount").value);
        mangaSettings.imageFit = DOM.get("image-fit").value;
        mangaSettings.collapseSpacing = DOM.get("collapse-spacing").checked;
        mangaSettings.spacingAmount = parseInt(DOM.get("spacing-amount").value);
        mangaSettings.backgroundColor = DOM.get("background-color").value;
        Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
        
        ThemeManager.handleThemeChange();
        SettingsManager.applySettings();
        $("#settings-modal").modal("hide");
    },

    applySettings: () => {
        if (!AppState.currentManga) return;
        const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
        const images = DOM.get("page-container").getElementsByTagName("img");
        for (let img of images) {
            switch (mangaSettings.imageFit) {
                case "height":
                    img.style.height = "100%";
                    img.style.width = "auto";
                    break;
                case "width":
                    img.style.width = "100%";
                    img.style.height = "auto";
                    break;
                case "both":
                    img.style.width = "100%";
                    img.style.height = "100%";
                    img.style.objectFit = "contain";
                    break;
                default:
                    img.style.width = "auto";
                    img.style.height = "auto";
            }
        }

        const spacing = mangaSettings.collapseSpacing ? 0 : mangaSettings.spacingAmount || 30;
        DOM.get("page-container").style.gap = `${spacing}px`;
        DOM.get("page-container").style.backgroundColor = mangaSettings.backgroundColor || getComputedStyle(document.querySelector(`.${AppState.theme}-theme`)).getPropertyValue('--bg-color').trim();
    },
};


function updateProgressBar() {
    const container = DOM.get("page-container");
    const scrollPosition = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const scrollPercentage = (scrollPosition / scrollHeight) * 100;
    DOM.get("chapter-progress-bar").style.width = `${scrollPercentage}%`;
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
}

function saveStateBeforeUnload() {
    if (AppState.currentManga) {
        PageManager.saveScrollPosition();
    }
}
document.addEventListener("visibilitychange", saveStateBeforeUnload);
window.addEventListener("beforeunload", saveStateBeforeUnload);

DOM.get("page-container").addEventListener("scroll", updateProgressBar);

// Theme Management
const ThemeManager = {
    applyTheme: (theme) => {
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add(`${theme}-theme`);
        AppState.update("theme", theme);
    },
    loadTheme: () => {
        const savedTheme = AppState.theme || "dark";
        ThemeManager.applyTheme(savedTheme);
        DOM.get("theme-select").value = savedTheme;
    },
    handleThemeChange: () => {
        const selectedTheme = DOM.get("theme-select").value;
        ThemeManager.applyTheme(selectedTheme);
    },
    toggleTheme: () => {
        const currentTheme = AppState.theme;
        const newTheme = currentTheme === "light" ? "dark" : "light";
        ThemeManager.applyTheme(newTheme);
        DOM.get("theme-select").value = newTheme;
    },
};

// Event Listeners
document.addEventListener("mousemove", (event) => {
    if (AppStateMachine.currentState !== "viewer") return;

    const visibilityRange = AppState.isNavVisible ? 75 : 55;
    const isInVerticalRange = window.innerHeight - event.clientY < visibilityRange;
    
    // Calculate the 5% buffer on each side
    const bufferZone = window.innerWidth * 0.05;
    const isInHorizontalRange = event.clientX > bufferZone && event.clientX < (window.innerWidth - bufferZone);

    let shouldBeVisible = (isInVerticalRange && isInHorizontalRange) || AppState.isChapterSelectorOpen;

    // Prevent nav bar from showing when using the scrubber
    if (ScrubberManager.isMouseOverScrubber()) {
        shouldBeVisible = false;
    }

    if (shouldBeVisible !== AppState.isNavVisible) {
        AppState.update("isNavVisible", shouldBeVisible);
        const navContainer = DOM.get("nav-container");
        if (navContainer) {
            navContainer.style.opacity = shouldBeVisible ? "1" : "0";
            navContainer.style.transform = shouldBeVisible ? "translateY(0)" : "translateY(100%)";
        }
    }
});

DOM.get("first-button").addEventListener("click", PageManager.goToFirstChapter);
DOM.get("prev-button").addEventListener("click", PageManager.loadPreviousChapter);
DOM.get("next-button").addEventListener("click", PageManager.loadNextChapter);
DOM.get("last-button").addEventListener("click", PageManager.goToLastChapter);

DOM.get("chapter-selector").addEventListener("change", ChapterManager.jumpToChapter);

DOM.get("zoom-in-button").addEventListener("click", ZoomManager.zoomIn);
DOM.get("zoom-out-button").addEventListener("click", ZoomManager.zoomOut);
DOM.get("zoom-reset-button").addEventListener("click", ZoomManager.resetZoom);

DOM.get("fullscreen-button").addEventListener("click", toggleFullScreen);
DOM.get("settings-button").addEventListener("click", () => {
    SettingsManager.openSettings();
    $('[data-toggle="tooltip"]').tooltip();
});
DOM.get("save-changes-btn").addEventListener("click", SettingsManager.saveSettings);
DOM.get("back-to-home").addEventListener("click", backToHomepage);

DOM.get("chapter-selector").addEventListener("focus", () => {
    AppState.update("isChapterSelectorOpen", true);
});

DOM.get("chapter-selector").addEventListener("blur", () => {
    AppState.update("isChapterSelectorOpen", false);
});

document.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;

    switch (event.key) {
        case "ArrowRight":
        case "d":
            PageManager.loadNextChapter();
            break;
        case "ArrowLeft":
        case "a":
            PageManager.loadPreviousChapter();
            break;
        case "ArrowUp":
        case "w":
            if (event.altKey) {
                ScrubberManager.navigateScrubber(-1);
            } else {
                DOM.get("page-container").scrollBy(0, -100);
            }
            break;
        case "ArrowDown":
        case "s":
            if (event.altKey) {
                ScrubberManager.navigateScrubber(1);
            } else {
                DOM.get("page-container").scrollBy(0, 100);
            }
            break;
        case "+":
            ZoomManager.zoomIn();
            break;
        case "-":
            ZoomManager.zoomOut();
            break;
        case "=":
            ZoomManager.resetZoom();
            break;
        case "f":
            toggleFullScreen();
            break;
        case "t":
            ThemeManager.toggleTheme();
            break;
        case "h":
            PageManager.goToFirstChapter();
            break;
        case "l":
            PageManager.goToLastChapter();
            break;
        case "r":
            PageManager.loadPages();
            break;
        case "S":
            SettingsManager.openSettings();
            break;
        case "Escape":
            backToHomepage();
            break;
    }
});

function showShortcutsHelp() {
    const shortcuts = [
        { key: "→ or d", action: "Next chapter" },
        { key: "← or a", action: "Previous chapter" },
        { key: "↑ or w", action: "Scroll up" },
        { key: "↓ or s", action: "Scroll down" },
        { key: "Alt + w", action: "Previous page" },
        { key: "Alt + s", action: "Next page" },
        { key: "h", action: "Go to first chapter" },
        { key: "l", action: "Go to last chapter" },
        { key: "+", action: "Zoom in" },
        { key: "-", action: "Zoom out" },
        { key: "=", action: "Reset zoom" },
        { key: "f", action: "Toggle fullscreen" },
        { key: "t", action: "Toggle theme" },
        { key: "r", action: "Reload current chapter" },
        { key: "Shift + S", action: "Open settings" },
        { key: "esc", action: "Back to homepage" },
    ];

    let shortcutsHTML = '<h3>Keyboard Shortcuts</h3><table class="table"><thead><tr><th>Key</th><th>Action</th></tr></thead><tbody>';
    shortcuts.forEach((shortcut) => {
        shortcutsHTML += `<tr><td>${shortcut.key}</td><td>${shortcut.action}</td></tr>`;
    });
    shortcutsHTML += "</tbody></table>";

    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "shortcuts-modal";
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Keyboard Shortcuts</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${shortcutsHTML}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    $(modal).on("hidden.bs.modal", function (e) {
        document.body.classList.add("modal-open");
        $(this).remove();
    });

    $(modal).modal("show");
}

DOM.get("shortcuts-help-button").addEventListener("click", showShortcutsHelp);
DOM.get("page-container").addEventListener("scroll", PageManager.handleScroll);
DOM.get("page-container").addEventListener(
    "scroll",
    Utils.debounce(() => {
        PageManager.saveScrollPosition();
        updateProgressBar();
    }, 200),
    { passive: true }
);

DOM.get("theme-select").addEventListener("change", ThemeManager.handleThemeChange);

DOM.get("add-manga-btn").addEventListener("click", () => {
    openAddModal();
    $('[data-toggle="tooltip"]').tooltip();
});

DOM.get("save-manga-btn").addEventListener("click", () => {
    const form = DOM.get("manga-form");
    const newManga = {
        title: form.querySelector("#manga-title").value,
        description: form.querySelector("#manga-description").value,
        imagesFullPath: form.querySelector("#manga-images-full-path").value,
        totalPages: parseInt(form.querySelector("#manga-total-pages").value),
        userProvidedTotalChapters: parseInt(form.querySelector("#manga-total-chapters").value),
        pagesPerChapter: Math.floor(parseInt(form.querySelector("#manga-total-pages").value) / parseInt(form.querySelector("#manga-total-chapters").value)),
    };
    newManga.totalChapters = Math.ceil(newManga.totalPages / newManga.pagesPerChapter);

    const editingMangaId = form.dataset.editingMangaId ? parseInt(form.dataset.editingMangaId) : null;
    if (editingMangaId !== null) {
        MangaManager.editManga(editingMangaId, newManga);
        delete form.dataset.editingMangaId;
    } else {
        MangaManager.addManga(newManga);
    }
    
    if (AppState.currentManga && AppState.currentManga.id === (editingMangaId || newManga.id)) {
        AppState.update("currentManga", { ...AppState.currentManga, ...newManga });
        ChapterManager.updateChapterSelector();
    }

    $("#manga-modal").modal("hide");
    form.reset();
});

DOM.get("manga-list").addEventListener("click", (event) => {
    const card = event.target.closest(".manga-card");
    if (!card) return;

    const mangaId = parseInt(card.dataset.mangaId);
    const manga = AppState.mangaList.find((manga) => manga.id === mangaId);

    if (event.target.closest(".edit-btn")) {
        openEditModal(manga);
    } else if (event.target.closest(".delete-btn")) {
        if (confirm("Are you sure you want to delete this manga?")) {
            MangaManager.deleteManga(mangaId);
        }
    } else {
        MangaManager.loadManga(manga);
    }
});

function openEditModal(manga) {
    const form = DOM.get("manga-form");
    form.querySelector("#manga-title").value = manga.title;
    form.querySelector("#manga-description").value = manga.description;
    form.querySelector("#manga-images-full-path").value = manga.imagesFullPath;
    form.querySelector("#manga-total-pages").value = manga.totalPages;
    form.querySelector("#manga-total-chapters").value = manga.userProvidedTotalChapters;
    form.dataset.editingMangaId = manga.id;

    document.querySelector("#manga-modal .modal-title").innerText = "Edit Manga";
    $("#manga-modal").modal("show");
}

function openAddModal() {
    const form = DOM.get("manga-form");
    form.reset();
    delete form.dataset.editingMangaId;

    document.querySelector("#manga-modal .modal-title").innerText = "Add New Manga";
    $("#manga-modal").modal("show");
}


// Initialize the application
function initializeApp() {
    ThemeManager.loadTheme();
    MangaManager.renderMangaList();
    triggerAnimations();
    Utils.toggleSpinner(false);
}

Utils.promptForPassword(); // Put your password's SHA256 hash inside the brackets in quotes to use the password feature
