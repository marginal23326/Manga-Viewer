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
        query: (selector, parent = document) => parent.querySelector(selector),
        queryAll: (selector, parent = document) => Array.from(parent.querySelectorAll(selector)),
    };
})();

const addListener = (elementOrId, event, handler) => {
    const element = typeof elementOrId === "string" ? DOM.get(elementOrId) : elementOrId;
    if (element && typeof element.addEventListener === "function") {
        element.addEventListener(event, handler);
    } else {
        console.warn(`Invalid element or ID: "${elementOrId}"`);
    }
};

const addListeners = (listeners) => {
    listeners.forEach(([target, event, handler, options]) => {
        (typeof target === 'string' ? document.getElementById(target) : target)
            .addEventListener(event, handler, options);
    });
};

// State Management
const State = {
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

    static updateImageRange(start, end) {
        if (!State.currentManga) return;
        DOM.get("image-range").textContent = `Showing images ${start} - ${end} of ${State.currentManga.totalImages}`;
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

        const modal = DOM.get("password-modal");
        const input = DOM.get("password-input");
        const submitBtn = DOM.get("submit-password");
        const errorMsg = DOM.get("password-error");
        const toggleBtn = DOM.get("toggle-password");
        const svgPrefix = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath";
        const eyeOpenSVG = `${svgPrefix} d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z'%3E%3C/path%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E`;
        const eyeClosedSVG = `${svgPrefix} d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24'%3E%3C/path%3E%3Cline x1='1' y1='1' x2='23' y2='23'%3E%3C/line%3E%3C/svg%3E`;
        
        Utils.toggleSpinner(false);
        modal.style.display = "block";
        input.focus();

        toggleBtn.addEventListener("click", function() {
            const inputType = input.getAttribute("type");
            const newType = inputType === "password" ? "text" : "password";
            input.setAttribute("type", newType);

            const eyeIcon = DOM.query(".eye-icon", this);
            const newIcon = newType === "password" ? eyeOpenSVG : eyeClosedSVG;
            eyeIcon.style.maskImage = `url("${newIcon}")`;
        });

        submitBtn.onclick = function() {
            const password = input.value;
            if (CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) === passwordHash) {
                modal.style.display = "none";
                initializeApp();
            } else {
                errorMsg.style.display = "block";
                input.value = "";
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
            start: chapter * manga.imagesPerChapter,
            end: Math.min((chapter + 1) * manga.imagesPerChapter, manga.totalImages),
        };
    }

    static saveMangaSettings(mangaId, settings) {
        State.mangaSettings[mangaId] = settings;
        State.update("mangaSettings", State.mangaSettings);
    }

    static loadMangaSettings(mangaId) {
        return (
            State.mangaSettings[mangaId] || {
                currentChapter: 0,
                scrollPosition: 0,
                zoomLevel: 1,
            }
        );
    }

    static withCurrentManga(callback) {
        if (!State.currentManga) return null;
        const mangaSettings = Utils.loadMangaSettings(State.currentManga.id);
        return callback(mangaSettings);
    }
}

// Manga Management
const MangaManager = {
    createMangaCard: async function(manga) {
        if (!manga?.id) {
            console.error("Invalid manga object:", manga);
            return null;
        }

        const card = document.createElement("div");
        card.classList.add("col-md-4", "col-sm-6");
        card.innerHTML = `
            <div class="card manga-card" data-manga-id="${manga.id}">
                <div class="card-img-top"></div>
                <div class="card-body">
                    <h5 class="card-title">${manga.title}</h5>
                    <p class="card-text chapter-info">
                        <small class="text-muted">Chapters: ${manga.userProvidedTotalChapters}</small>
                    </p>
                    <p class="card-text">${manga.description}</p>
                </div>
                <button class="btn btn-outline-secondary edit-btn" aria-label="Edit Manga">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger delete-btn" aria-label="Delete Manga">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        const mangaCard = card.querySelector('.manga-card');
        const imgContainer = card.querySelector(".card-img-top");

        const handleMouseMove = (e) => {
            const { width, height, left, top } = mangaCard.getBoundingClientRect();
            const x = e.clientX - left;
            const y = e.clientY - top;
            const centerX = width / 2;
            const centerY = height / 2;
            const sensitivity = 0.02;

            mangaCard.style.transform = `
                perspective(1000px)
                rotateX(${(centerY - y) * sensitivity}deg)
                rotateY(${(x - centerX) * sensitivity}deg)
                scale3d(1.02, 1.02, 1.02)
            `;

            mangaCard.style.backgroundImage = `
                radial-gradient(
                    circle at ${(x / width) * 100}% ${(y / height) * 100}%,
                    rgba(23, 47, 47, 0.2) 0%,
                    transparent 50%
                )
            `;
        };

        const handleMouseLeave = () => {
            mangaCard.style.backgroundImage = '';
            mangaCard.style.transform = '';
        };

        addListeners([
            [mangaCard, 'mousemove', handleMouseMove],
            [mangaCard, 'mouseleave', handleMouseLeave]
        ]);

        try {
            const img = await ImageLoader.loadImage(manga.imagesFullPath, 1);
            img.alt = manga.title;
            imgContainer.appendChild(img);
        } catch (error) {
            imgContainer.innerHTML = "<div class='error-placeholder'>Image not available</div>";
        }

        return card;
    },

    renderMangaList: async function() {
        const mangaListElement = DOM.get("manga-list");
        mangaListElement.innerHTML = "";
        
        const cardPromises = State.mangaList.map(async (manga) => {
            return await MangaManager.createMangaCard(manga);
        });

        const cards = await Promise.all(cardPromises);
        
        cards.forEach(card => {
            if (card) {
                mangaListElement.appendChild(card);
            }
        });

        MangaManager.initSortable();
    },

    initSortable: () => {
        new Sortable(DOM.get("manga-list"), {
            animation: 150,
            onEnd: () => {
                const newOrder = Array.from(DOM.get("manga-list").children).map((card) => State.mangaList.find((manga) => manga.id === parseInt(DOM.query(".manga-card", card).dataset.mangaId)));
                State.update("mangaList", newOrder);
                MangaManager.saveMangaList();
            },
        });
    },

    openMangaModal: (manga = null) => {
        const modal = DOM.get("manga-modal");
        DOM.query(".modal-title", modal).textContent = manga ? "Edit Manga" : "Add Manga";

        const formContainer = DOM.query(".modal-body", modal);
        formContainer.innerHTML = DOM.get("manga-form").outerHTML;

        const mangaForm = new MangaForm("#manga-modal #manga-form");
        if (manga) {
            mangaForm.setFormData(manga);
            mangaForm.setEditingMangaId(manga.id);
        } else {
            mangaForm.reset();
        }

        ModalUtils.show("manga-modal");
        $("[data-bs-toggle='tooltip']").tooltip();
    },

    saveManga: () => {
        const mangaForm = new MangaForm("#manga-modal #manga-form");
        const mangaData = mangaForm.getFormData();

        const { totalImages, userProvidedTotalChapters } = mangaData;
        mangaData.imagesPerChapter = Math.round(totalImages / userProvidedTotalChapters);
        mangaData.totalChapters = Math.ceil(totalImages / mangaData.imagesPerChapter);

        const editingId = mangaForm.getEditingMangaId();
        editingId ? MangaManager.editManga(parseInt(editingId), mangaData) : MangaManager.addManga(mangaData);

        ModalUtils.hide("manga-modal");
    },


    addManga: (manga) => {
        manga.id = Date.now();
        State.mangaList.push(manga);
        MangaManager.saveMangaList();
        MangaManager.renderMangaList();
        ChapterManager.updateChapterSelector();
    },

    editManga: (id, updatedManga) => {
        const index = State.mangaList.findIndex((manga) => manga.id === id);
        if (index !== -1) {
            State.mangaList[index] = { ...State.mangaList[index], ...updatedManga };
            MangaManager.saveMangaList();
            MangaManager.renderMangaList();
            if (State.currentManga && State.currentManga.id === id) {
                State.update("currentManga", State.mangaList[index]);
                ChapterManager.updateChapterSelector();
                ImageManager.loadImages();
            }
        }
    },

    deleteManga: (mangaId) => {
        const dialog = DOM.get('delete-confirmation-dialog');
        const closeDialog = () => dialog.style.display = 'none';

        dialog.style.display = 'flex';
        dialog.style.alignItems = 'center';

        DOM.get('confirm-delete-btn').onclick = () => {
            State.mangaList = State.mangaList.filter(manga => manga.id !== mangaId);
            MangaManager.saveMangaList();
            MangaManager.renderMangaList();
            
            if (State.currentManga?.id === mangaId) {
                State.update("currentManga", null);
                ChapterManager.updateChapterSelector();
                ImageManager.loadImages();
            }
            
            closeDialog();
        };

        dialog.querySelector('[data-dismiss="modal"]').onclick = closeDialog;
    },

    saveMangaList: () => {
        localStorage.setItem("mangaList", JSON.stringify(State.mangaList));
    },

    loadManga: (manga) => {
        if (State.currentManga) {
            ImageManager.saveScrollPosition();
        }
        State.update("currentManga", manga);
        showViewer();
        ImageManager.loadImages();
        ChapterManager.updateChapterSelector();
        DOM.get("chapter-progress-bar").style.width = "0%";
        ZoomManager.applyZoom();
        SettingsManager.populateMangaDetails();
    },
};

function toggleProgressBarVisibility(visible) {
    const progressBar = DOM.get("chapter-progress-bar");
    if (progressBar) {
        progressBar.style.display = visible ? "block" : "none";
    }
}

function clearMangaState() {
    if (State.currentManga) {
        ImageManager.saveScrollPosition();
    }
    State.update("currentManga", null);
    DOM.get("chapter-progress-bar").style.width = "0%";
    window.scrollTo(0, 0);
}


const StateMachine = {
    currentState: "homepage",
    
    setState(newState) {
        this.currentState = newState;
        this.updateUI();
    },

    updateUI() {
        const homepageContainer = DOM.get("homepage-container");
        const imageContainer = DOM.get("image-container");
        const navContainer = DOM.get("nav-container");
        const isHomepage = this.currentState === "homepage";

        if (homepageContainer) homepageContainer.style.display = isHomepage ? "block" : "none";
        if (imageContainer) imageContainer.style.display = isHomepage ? "none" : "inline-flex";
        if (navContainer) navContainer.style.display = isHomepage ? "none" : "flex";

        toggleProgressBarVisibility(!isHomepage);
        SidebarManager.updateContentVisibility(isHomepage);
        ScrubberManager.removeEventListeners(isHomepage);
    },
};

function showHomepage() {
    if (StateMachine.currentState !== "homepage") {
        if (State.currentManga) {
            ImageManager.saveScrollPosition();
        }
        State.update("currentManga", null);
        StateMachine.setState("homepage");
        triggerAnimations();
    }
}

function triggerAnimations() {
    document.body.classList.remove("animate-title");
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add("animate-title");
        });
    });
}

function showViewer() {
    if (StateMachine.currentState !== "viewer") {
        StateMachine.setState("viewer");
    }
}

function returnToHome() {
    clearMangaState();
    showHomepage();
}

const lazyLoadImages = () => {
    const images = DOM.queryAll("img[data-src]");
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

const ImageLoader = {
    supportedFormats: ["webp", "jpg", "jpeg", "png", "gif"],
    lastSuccessfulFormat: "webp",
    lastSuccessfulPadding: "",
    loadImage: async function(basePath, index, onLoad, onError) {
        const paddingPatterns = ["", "0", "00"];
        const formats = [this.lastSuccessfulFormat, ...this.supportedFormats.filter(f => f !== this.lastSuccessfulFormat)];
        const paddings = [this.lastSuccessfulPadding, ...paddingPatterns.filter(p => p !== this.lastSuccessfulPadding)];

        for (const format of formats) {
            for (const padding of paddings) {
                const paddedIndex = index.toString().padStart(padding.length + 1, padding);
                try {
                    const img = await this.tryLoadImage(`${basePath}\\${paddedIndex}.${format}`);
                    this.lastSuccessfulFormat = format;
                    this.lastSuccessfulPadding = padding;
                    onLoad?.(img);
                    return img;
                } catch (error) {}
            }
        }
        onError?.(index);
        return null;
    },
    tryLoadImage: function(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load ${src}`));
            img.src = src;
        });
    }
};

// Image Management
const ImageManager = {
    loadImages: async function() {
        if (!State.currentManga) return;

        const mangaSettings = Utils.loadMangaSettings(State.currentManga.id);
        const { start, end } = Utils.getChapterBounds(State.currentManga, mangaSettings.currentChapter);

        if (start >= State.currentManga.totalImages || end > State.currentManga.totalImages) {
            ImageManager.goToFirstChapter();
            return;
        }

        const imageContainer = DOM.get("image-container");
        imageContainer.innerHTML = "";
        Utils.toggleSpinner(true);

        const fragment = document.createDocumentFragment();

        for (let i = start; i < end; i++) {
            const index = i + 1;
            await ImageLoader.loadImage(State.currentManga.imagesFullPath, index, (img) => {
                img.dataset.originalHeight = img.naturalHeight;
                img.loading = "lazy";
                addListeners([
                    [img, "mousedown", (event) => LightboxManager.handleMouseDown(event, img)],
                    [img, "mouseup", LightboxManager.handleMouseUp],
                    [img, "click", ImageManager.handleClick]
                ]);
                fragment.appendChild(img);
            });
        }

        imageContainer.appendChild(fragment);

        imagesLoaded(imageContainer, function() {
            Utils.toggleSpinner(false);
            ImageManager.restoreScrollPosition();
            SettingsManager.applySettings();
            SettingsManager.populateSettings();
            SettingsManager.saveMangaSettings(State.currentManga?.id);
            ZoomManager.applyZoom();
            lazyLoadImages();
            Utils.updateImageRange(start + 1, start + imageContainer.childElementCount);
            ChapterManager.updateChapterSelector();
            ScrubberManager.init();
            ScrubberManager.setupScrubberPreview();
            ScrubberManager.updateVisibleImage(0);
            setTimeout(() => State.isNavVisible = true, 1500);

            const nextChapterStart = end;
            const nextChapterEnd = Math.min(nextChapterStart + State.currentManga.imagesPerChapter, State.currentManga.totalImages);
            ImageManager.preloadChapter(nextChapterStart, nextChapterEnd);
        });
    },

    preloadChapter: async function(startIndex, endIndex) {
        if (!State.currentManga) return;
        for (let i = startIndex; i < endIndex; i++) {
            await ImageLoader.loadImage(
                State.currentManga.imagesFullPath,
                i + 1,
                () => {},
                () => {}
            );
        }
    },

    changeChapter: (direction) => {
        Utils.withCurrentManga((mangaSettings) => {
            const newChapter = mangaSettings.currentChapter + direction;
            if (newChapter >= 0 && newChapter < State.currentManga.totalChapters) {
                mangaSettings.currentChapter = newChapter;
                mangaSettings.scrollPosition = 0;
                Utils.saveMangaSettings(State.currentManga.id, mangaSettings);
                ImageManager.loadImages();
            }
        });
    },

    loadNextChapter: () => ImageManager.changeChapter(1),
    loadPreviousChapter: () => ImageManager.changeChapter(-1),
    goToFirstChapter: () => {
        Utils.withCurrentManga((mangaSettings) => {
            mangaSettings.currentChapter = 0;
            Utils.saveMangaSettings(State.currentManga.id, mangaSettings);
            ImageManager.loadImages();
            ImageManager.saveScrollPosition();
        });
    },

    goToLastChapter: () => {
        Utils.withCurrentManga((mangaSettings) => {
            mangaSettings.currentChapter = State.currentManga.totalChapters - 1;
            Utils.saveMangaSettings(State.currentManga.id, mangaSettings);
            ImageManager.loadImages();
            ImageManager.saveScrollPosition();
        });
    },

    restoreScrollPosition: () => {
        const smoothScrollSupported = 'scrollBehavior' in document.documentElement.style;

        const smoothScroll = (targetPosition) => {
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        };

        const customSmoothScroll = (targetPosition, duration = 1000) => {
            const startPosition = window.pageYOffset;
            const distance = targetPosition - startPosition;
            let startTime = null;
            const animation = (currentTime) => {
                if (startTime === null) startTime = currentTime;
                const timeElapsed = currentTime - startTime;
                const run = easeOutCubic(timeElapsed, startPosition, distance, duration);
                window.scrollTo(0, run);
                if (timeElapsed < duration) requestAnimationFrame(animation);
            };
            const easeOutCubic = (t, b, c, d) => {
                t /= d;
                t--;
                return c * (t * t * t + 1) + b;
            };
            requestAnimationFrame(animation);
        };

        Utils.withCurrentManga((mangaSettings) => {
            const targetPosition = mangaSettings.scrollPosition || 0;
            const imageContainer = DOM.get("image-container");

            imagesLoaded(imageContainer, function() {
                setTimeout(() => {
                    if (smoothScrollSupported) {
                        smoothScroll(targetPosition);
                    } else {
                        customSmoothScroll(targetPosition);
                    }
                }, 500);
            });
        });
    },

    saveScrollPosition: () => {
        Utils.withCurrentManga((mangaSettings) => {
            mangaSettings.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            Utils.saveMangaSettings(State.currentManga.id, mangaSettings);
        });
    },

    handleClick: (event) => {
        const clickY = event.clientY;
        const viewportHeight = window.innerHeight;
        const mangaSettings = Utils.loadMangaSettings(State.currentManga?.id);
        const duration = 400;
        let start = null;
        const startPosition = window.pageYOffset;
        let endPosition;
        if (clickY < viewportHeight / 2) {
            endPosition = startPosition - mangaSettings.scrollAmount;
        } else {
            endPosition = startPosition + mangaSettings.scrollAmount;
        }
        function step(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percentage = Math.min(progress / duration, 1);
            window.scrollTo(0, startPosition + (endPosition - startPosition) * ImageManager.easeInOutCubic(percentage));
            if (progress < duration) {
                window.requestAnimationFrame(step);
            }
        }
        window.requestAnimationFrame(step);
    },

    easeInOutCubic: (t) => {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },

    handleScroll: Utils.debounce(() => {
        ScrubberManager.updateActiveMarker();
        ImageManager.saveScrollPosition();
    }, 100),
};

// Scrubber Management
const ScrubberManager = {
    scrubberImages: [],
    state: {
        screenHeight: 0,
        previewHeight: 0,
        markerHeight: 0,
        visibleImageIndex: 0,
        previewImageIndex: 0,
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
        ScrubberManager.manageEventListeners(scrubber, "addEventListener");
        DOM.get("scrubber-icon").style.opacity = "0.8";
    },

    removeEventListeners: (remove) => {
        if (!remove) return;
        const scrubber = DOM.get("scrubber");
        ScrubberManager.manageEventListeners(scrubber, "removeEventListener");
        DOM.get("scrubber-container").style.opacity = "0";
        DOM.get("scrubber-icon").style.opacity = "0";
    },

    isMouseOverScrubber: () => {
        return ScrubberManager.state.isMouseOverScrubber;
    },

    hideNavBar: () => {
        State.update("isNavVisible", false);
        const navContainer = DOM.get("nav-container");
        if (navContainer) {
            navContainer.style.opacity = "0";
            navContainer.style.transform = "translateY(-100%)";
        }
    },

    setupScrubberPreview: async function() {
        const scrubberPreview = DOM.get("scrubber-preview");
        scrubberPreview.innerHTML = "";
        ScrubberManager.scrubberImages = [];

        await Utils.withCurrentManga(async (mangaSettings) => {
            const { start, end } = Utils.getChapterBounds(State.currentManga, mangaSettings.currentChapter);
            const fragment = document.createDocumentFragment();

            for (let i = 0; i < end - start; i++) {
                const index = start + i + 1;
                try {
                    await ImageLoader.loadImage(
                        State.currentManga.imagesFullPath, 
                        index, 
                        (loadedImg) => {
                            loadedImg.loading = "lazy";
                            loadedImg.classList.add("scrubber-preview-image");
                            loadedImg.dataset.index = `${i}`;
                            ScrubberManager.scrubberImages.push(loadedImg);
                            fragment.appendChild(loadedImg);
                        },
                        (failedIndex) => {
                            console.warn(`Failed to load scrubber preview image at index ${failedIndex}`);
                        }
                    );
                } catch (error) {
                    console.error(`Error loading scrubber preview image at index ${index}:`, error);
                }
            }

            scrubberPreview.appendChild(fragment);
        });

        ScrubberManager.state.previewHeight = scrubberPreview.offsetHeight;
        ScrubberManager.state.screenHeight = window.innerHeight;
        ScrubberManager.state.markerHeight = DOM.get("scrubber-marker").offsetHeight;
        ScrubberManager.setScrubberMarkerActive(ScrubberManager.state.visibleImageIndex);
    },

    handleScrubberEnter: (event) => {
        ScrubberManager.state.isMouseOverScrubber = true;
        const scrubberContainer = DOM.get("scrubber-container");
        scrubberContainer.style.opacity = "1";
        DOM.get("scrubber-icon").style.opacity = "0";
        ScrubberManager.hideNavBar();
    },

    handleScrubberLeave: (event) => {
        ScrubberManager.state.isMouseOverScrubber = false;
        DOM.get("scrubber-container").style.opacity = "0";
        DOM.get("scrubber-icon").style.opacity = "0.8";
        setTimeout(() => {
            if (!ScrubberManager.isMouseOverScrubber()) {
                State.update("isNavVisible", false);
            }
        }, 500);
    },

    handleScrubberMove: (event) => {
        const cursorY = event.clientY;
        const cursorYRatio = cursorY / ScrubberManager.state.screenHeight;
        ScrubberManager.state.previewImageIndex = Math.floor(cursorYRatio * ScrubberManager.scrubberImages.length);

        ScrubberManager.setMarkerPosition(cursorY);
        ScrubberManager.setMarkerText(`${ScrubberManager.state.previewImageIndex + 1}`);
        ScrubberManager.setPreviewScroll(cursorY);
        ScrubberManager.highlightHoveredImage();
    },

    handleScrubberClick: (event) => {
        const cursorYRatio = event.clientY / ScrubberManager.state.screenHeight;
        const imageIndex = Math.floor(cursorYRatio * ScrubberManager.scrubberImages.length);
        ScrubberManager.goToImage(imageIndex);
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
        const totalImages = ScrubberManager.scrubberImages.length;
        const activeY = (activeIndex / (totalImages - 1)) * (ScrubberManager.state.screenHeight - ScrubberManager.state.markerHeight);
        DOM.get("scrubber-marker-active").style.transform = `translateY(${activeY}px)`;
        DOM.get("scrubber-marker-active").innerText = `${activeIndex + 1}`;
    },

    highlightHoveredImage: () => {
        ScrubberManager.scrubberImages.forEach((img, index) => {
            if (index === ScrubberManager.state.previewImageIndex) {
                img.classList.add("hovered");
            } else {
                img.classList.remove("hovered");
            }
        });
    },

    updateVisibleImage: (imageIndex) => {
        if (imageIndex !== ScrubberManager.state.visibleImageIndex) {
            ScrubberManager.state.visibleImageIndex = imageIndex;
            ScrubberManager.setScrubberMarkerActive(imageIndex);
        }
    },

    navigateScrubber: (delta) => {
        const newIndex = Math.max(0, Math.min(ScrubberManager.state.visibleImageIndex + delta, ScrubberManager.scrubberImages.length - 1));
        ScrubberManager.goToImage(newIndex);
    },

    goToImage: (imageIndex) => {
        imageIndex = Math.max(0, Math.min(imageIndex, ScrubberManager.scrubberImages.length - 1));
        const imageContainer = DOM.get("image-container");
        const images = DOM.queryAll("img", imageContainer);
        if (images[imageIndex]) {
            images[imageIndex].scrollIntoView({ behavior: "smooth", block: "start" });
            ScrubberManager.updateVisibleImage(imageIndex);
        }
    },

    updateActiveMarker: () => {
        const imageContainer = DOM.get("image-container");
        const images = DOM.queryAll("img", imageContainer);
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        let visibleImageIndex = 0;
        for (let i = 0; i < images.length; i++) {
            const imgRect = images[i].getBoundingClientRect();
            if (imgRect.top >= 0 - imgRect.height / 2) {
                visibleImageIndex = i;
                break;
            }
        }
        ScrubberManager.updateVisibleImage(visibleImageIndex);
    },
};

// Zoom Management
const ZoomManager = {
    adjustZoom: (newZoomLevel) => {
        Utils.withCurrentManga((mangaSettings) => {
            const oldZoomLevel = mangaSettings.zoomLevel;
            mangaSettings.zoomLevel = Number(newZoomLevel.toFixed(2));
            
            const viewportHeight = window.innerHeight;
            const oldContentHeight = document.documentElement.scrollHeight;
            const relativePosition = window.pageYOffset / (oldContentHeight - viewportHeight);
            
            Utils.saveMangaSettings(State.currentManga.id, mangaSettings);
            ZoomManager.applyZoom();
            
            const newContentHeight = document.documentElement.scrollHeight;
            const newScrollTop = relativePosition * (newContentHeight - viewportHeight);
            
            window.scrollTo(0, Math.round(newScrollTop));
        });
    },
    
    changeZoom: (factor) => {
        Utils.withCurrentManga((mangaSettings) => {
            const newZoomLevel = Math.max(0.1, mangaSettings.zoomLevel + factor);
            ZoomManager.adjustZoom(newZoomLevel);
        });
    },
    
    zoomIn: () => ZoomManager.changeZoom(0.05),
    zoomOut: () => ZoomManager.changeZoom(-0.05),
    resetZoom: () => ZoomManager.adjustZoom(1),
    
    applyZoom: () => {
        Utils.withCurrentManga((mangaSettings) => {
            const images = DOM.get("image-container").getElementsByTagName("img");
            const imageFit = mangaSettings.imageFit;
            const viewportHeight = window.innerHeight;
            const zoomLevel = mangaSettings.zoomLevel;
            
            for (let img of images) {
                const originalWidth = parseFloat(img.dataset.originalWidth);
                const originalHeight = parseFloat(img.dataset.originalHeight);
                
                img.style.maxWidth = "none";
                img.style.transform = "none";
                
                switch (imageFit) {
                    case "height":
                        img.style.height = `${viewportHeight * zoomLevel}px`;
                        img.style.width = "auto";
                        break;
                    case "width":
                        img.style.width = `${100 * zoomLevel}%`;
                        img.style.height = "auto";
                        break;
                    default:
                        img.style.width = `${Math.round(originalWidth * zoomLevel)}px`;
                        img.style.height = `${Math.round(originalHeight * zoomLevel)}px`;
                }
            }
            
            const zoomPercentage = Math.round(zoomLevel * 100);
            DOM.get("zoom-level").textContent = `Zoom: ${zoomPercentage}%`;
        });
    },
};

// Chapter Management
const ChapterManager = {
    jumpToChapter: () => {
        if (!State.currentManga) return;
        const selectedChapter = parseInt(DOM.get("chapter-selector").value);
        if (selectedChapter >= 0 && selectedChapter < State.currentManga.totalChapters) {
            const mangaSettings = Utils.loadMangaSettings(State.currentManga.id);
            mangaSettings.currentChapter = selectedChapter;
            mangaSettings.scrollPosition = 0;
            Utils.saveMangaSettings(State.currentManga.id, mangaSettings);
            ImageManager.loadImages();
            DOM.get("chapter-selector").blur();
            DOM.get("chapter-progress-bar").style.width = "0%";
            window.scrollTo(0, 0);
        }
        setTimeout(() => updateState(false), 100);
    },

    updateChapterSelector: () => {
        Utils.withCurrentManga((mangaSettings) => {
            DOM.get("chapter-selector").innerHTML = Array.from({ length: State.currentManga.totalChapters }, (_, i) => `<option value="${i}" ${i === mangaSettings.currentChapter ? "selected" : ""}>Chapter ${i}</option>`).join("");
        });
    },
};

// Lightbox Management
const LightboxManager = {
    currentImageIndex: 0,
    
    openLightbox: (imgSrc) => {
        if (!State.lightbox.element) LightboxManager.createLightbox();
        const images = Array.from(DOM.get("image-container").getElementsByTagName("img"));
        LightboxManager.currentImageIndex = images.findIndex(img => img.src === imgSrc);
        LightboxManager.loadCurrentImage();
        State.lightbox.element.style.display = "flex";
        document.body.style.overflow = "hidden";
        LightboxManager.updateButtonVisibility();
    },

    loadCurrentImage: () => {
        const images = Array.from(DOM.get("image-container").getElementsByTagName("img"));
        if (LightboxManager.currentImageIndex >= 0 && LightboxManager.currentImageIndex < images.length) {
            const currentImg = images[LightboxManager.currentImageIndex];
            currentImg.complete && currentImg.naturalHeight !== 0 ? 
                State.lightbox.img.src = currentImg.src : 
                LightboxManager.skipToNextValidImage(1);
        }
    },

    skipToNextValidImage: (direction) => {
        const images = Array.from(DOM.get("image-container").getElementsByTagName("img"));
        let nextIndex = LightboxManager.currentImageIndex + direction;
        while (nextIndex >= 0 && nextIndex < images.length) {
            const img = images[nextIndex];
            if (img.complete && img.naturalHeight !== 0) {
                LightboxManager.currentImageIndex = nextIndex;
                State.lightbox.img.src = img.src;
                LightboxManager.updateButtonVisibility();
                return;
            }
            nextIndex += direction;
        }
        LightboxManager.closeLightbox();
    },

    closeLightbox: () => {
        State.lightbox.element.style.display = "none";
        LightboxManager.resetZoomAndPosition();
        document.body.style.overflow = "auto";
    },

    createLightbox: () => {
        State.lightbox.element = document.createElement("div");
        State.lightbox.element.id = "lightbox";
        State.lightbox.element.addEventListener("click", LightboxManager.handleLightboxClick);

        State.lightbox.img = document.createElement("img");
        Object.entries({ mousedown: "start", touchstart: "start", mousemove: "drag", touchmove: "drag", mouseup: "end", mouseleave: "end", touchend: "end", wheel: "zoom"}).forEach(([event, handler]) => 
            State.lightbox.img.addEventListener(event, LightboxManager[handler]));

        const createButton = (id, innerHTML, clickHandler) => {
            const button = document.createElement("span");
            button.id = id;
            button.innerHTML = innerHTML;
            button.addEventListener("click", clickHandler);
            return button;
        };

        const closeButton = createButton("lightbox-close", "&times;", LightboxManager.closeLightbox);
        State.lightbox.prevButton = createButton("lightbox-prev", "&#10094;", LightboxManager.prevImage);
        State.lightbox.nextButton = createButton("lightbox-next", "&#10095;", LightboxManager.nextImage);

        [State.lightbox.img, closeButton, State.lightbox.prevButton, State.lightbox.nextButton]
            .forEach(el => State.lightbox.element.appendChild(el));
        document.body.appendChild(State.lightbox.element);
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
        const images = Array.from(DOM.get("image-container").getElementsByTagName("img"));
        State.lightbox.prevButton.style.display = LightboxManager.currentImageIndex > 0 ? "inline-flex" : "none";
        State.lightbox.nextButton.style.display = LightboxManager.currentImageIndex < images.length - 1 ? "inline-flex" : "none";
    },

    resetZoomAndPosition: () => {
        State.lightbox.img.style.transform = "translate(0, 0) scale(1)";
        State.lightbox.currentScale = 1;
        State.lightbox.currentTranslateX = State.lightbox.currentTranslateY = 0;
    },

    handleMouseDown: (event, img) => {
        event.preventDefault();
        LightboxManager.clickTimeout = setTimeout(() => LightboxManager.openLightbox(img.src), 200);
    },

    handleMouseUp: () => clearTimeout(LightboxManager.clickTimeout),

    handleLightboxClick: (event) => {
        if (event.target === State.lightbox.element) LightboxManager.closeLightbox();
    },

    start: (event) => {
        event.preventDefault();
        if (event.target.tagName === "IMG" && event.target.closest("#lightbox")) {
            State.lightbox.isDragging = true;
            State.lightbox.startX = event.type.startsWith("touch") ? event.touches[0].clientX : event.clientX;
            State.lightbox.startY = event.type.startsWith("touch") ? event.touches[0].clientY : event.clientY;
            State.lightbox.startTranslateX = State.lightbox.currentTranslateX;
            State.lightbox.startTranslateY = State.lightbox.currentTranslateY;
            State.lightbox.img.style.cursor = "grabbing";
        }
    },

    drag: (event) => {
        event.preventDefault();
        if (State.lightbox.isDragging) {
            const currentX = event.type.startsWith("touch") ? event.touches[0].clientX : event.clientX;
            const currentY = event.type.startsWith("touch") ? event.touches[0].clientY : event.clientY;
            State.lightbox.currentTranslateX = State.lightbox.startTranslateX + currentX - State.lightbox.startX;
            State.lightbox.currentTranslateY = State.lightbox.startTranslateY + currentY - State.lightbox.startY;
            State.lightbox.img.style.transform = `translate(${State.lightbox.currentTranslateX}px, ${State.lightbox.currentTranslateY}px) scale(${State.lightbox.currentScale})`;
        }
    },

    end: () => {
        if (State.lightbox.isDragging) {
            State.lightbox.isDragging = false;
            State.lightbox.img.style.cursor = "grab";
        }
    },

    zoom: (event) => {
        event.preventDefault();
        const rect = State.lightbox.img.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (mouseX < 0 || mouseY < 0 || mouseX > rect.width || mouseY > rect.height) return;

        const isZoomingOut = event.deltaY > 0;
        const scaleAmount = isZoomingOut ? 0.8064516129032258 : 1.24;
        let newScale = State.lightbox.currentScale * scaleAmount;

        if (newScale < 1) newScale = 1;
        else if (newScale > 40) return;

        let offsetX, offsetY;

        const centeringThreshold = 3.5;

        if (isZoomingOut && newScale < centeringThreshold) {
            const centeringProgress = Math.pow((centeringThreshold - newScale) / (centeringThreshold - 1), 2);

            const targetCenterX = -State.lightbox.currentTranslateX;
            const targetCenterY = -State.lightbox.currentTranslateY;

            const cursorOffsetX = (mouseX - rect.width / 2) * (scaleAmount - 1);
            const cursorOffsetY = (mouseY - rect.height / 2) * (scaleAmount - 1);

            offsetX = cursorOffsetX * (1 - centeringProgress) - targetCenterX * centeringProgress;
            offsetY = cursorOffsetY * (1 - centeringProgress) - targetCenterY * centeringProgress;
        } else {
            offsetX = (mouseX - rect.width / 2) * (scaleAmount - 1);
            offsetY = (mouseY - rect.height / 2) * (scaleAmount - 1);
        }

        State.lightbox.currentTranslateX -= offsetX;
        State.lightbox.currentTranslateY -= offsetY;
        State.lightbox.currentScale = newScale;

        State.lightbox.img.style.transform = `translate(${State.lightbox.currentTranslateX}px, ${State.lightbox.currentTranslateY}px) scale(${State.lightbox.currentScale})`;
    },
};

const toggleClass = (elements, classNames, action) => {
    elements.forEach(el => {
        classNames.split(" ").forEach(className => {
            el.classList[action](className);
        });
    });
};

const toggleDisplay = (elements, display) => {
    elements.forEach(el => el.style.display = display);
};

const setActiveTab = (tabList, tabContent, activeTabId) => {
    toggleClass(Array.from(DOM.queryAll("a", tabList)), "active", "remove");
    DOM.query(`a[href="#${activeTabId}"]`, tabList).classList.add("active");

    toggleClass(Array.from(tabContent.children), "show active", "remove");
    DOM.query(`#${activeTabId}`, tabContent).classList.add("show", "active");
};

const FormUtils = {
    getValue: (id) => DOM.get(id).value,
    setValue: (id, value) => DOM.get(id).value = value,
    getChecked: (id) => DOM.get(id).checked,
    setChecked: (id, checked) => DOM.get(id).checked = checked,
};

const ModalUtils = {
    show: (modalId) => $(`#${modalId}`).modal("show"),
    hide: (modalId) => $(`#${modalId}`).modal("hide"),
};

// Settings Management
const SettingsManager = {
    openSettings: () => {
        const settingsModal = DOM.get("settings-modal");
        const tabList = DOM.query("#settingsTabs", settingsModal);
        const tabContent = DOM.query("#settingsTabContent", settingsModal);
        setActiveTab(tabList, tabContent, "general");

        const isDisabled = !State.currentManga;

        Array.from(tabList.children).forEach(child => {
            const link = DOM.query('a', child);
            if (link.getAttribute('href') !== "#general") {
                link.classList.toggle('disabled', isDisabled);
                link.style.pointerEvents = isDisabled ? 'none' : '';
                link.style.opacity = isDisabled ? '0.5' : '1';
            }
        });

        ModalUtils.show("settings-modal");
        SettingsManager.populateSettings();
        $("[data-bs-toggle='tooltip']").tooltip();
    },

    populateSettings: () => {
        const mangaSettings = Utils.loadMangaSettings(State.currentManga?.id) || {};

        FormUtils.setValue("theme-select", State.theme);
        FormUtils.setValue("scroll-amount", mangaSettings.scrollAmount || 300);
        FormUtils.setValue("image-fit", mangaSettings.imageFit || "original");
        FormUtils.setChecked("collapse-spacing", mangaSettings.collapseSpacing || false);
        FormUtils.setValue("spacing-amount", mangaSettings.spacingAmount || 30);

        if (State.currentManga) {
            SettingsManager.populateMangaDetails();
        }
    },

    populateMangaDetails: () => {
        const mangaForm = new MangaForm("#settings-modal #manga-form");
        if (State.currentManga) {
            mangaForm.setFormData(State.currentManga);
            mangaForm.setEditingMangaId(State.currentManga.id);
        } else {
            mangaForm.reset();
        }
    },

    saveMangaSettings: (mangaId) => {
        const mangaSettings = Utils.loadMangaSettings(mangaId) || {};
        mangaSettings.scrollAmount = parseInt(FormUtils.getValue("scroll-amount"));
        mangaSettings.imageFit = FormUtils.getValue("image-fit");
        mangaSettings.collapseSpacing = FormUtils.getChecked("collapse-spacing");
        mangaSettings.spacingAmount = parseInt(FormUtils.getValue("spacing-amount"));
        Utils.saveMangaSettings(mangaId, mangaSettings);
    },

    saveSettings: () => {
        const mangaId = State.currentManga?.id;
        SettingsManager.saveMangaSettings(mangaId);

        if (State.currentManga) {
            const mangaForm = new MangaForm("#settings-modal #manga-form");
            const updatedManga = mangaForm.getFormData();
            updatedManga.imagesPerChapter = Math.round(updatedManga.totalImages / updatedManga.userProvidedTotalChapters);
            updatedManga.totalChapters = Math.ceil(updatedManga.totalImages / updatedManga.imagesPerChapter);

            MangaManager.editManga(State.currentManga.id, updatedManga);
            State.currentManga = { ...State.currentManga, ...updatedManga };
        }

        ThemeManager.handleThemeChange();
        SettingsManager.applySettings();
        ModalUtils.hide("settings-modal");
    },

    applySettings: () => {
        if (!State.currentManga) return;
        const mangaSettings = Utils.loadMangaSettings(State.currentManga.id);
        const spacing = mangaSettings.collapseSpacing ? 0 : mangaSettings.spacingAmount || 30;
        DOM.get("image-container").style.gap = `${spacing}px`;
    },
};


function updateProgressBar() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = (scrollTop / scrollHeight) * 100;
    DOM.get("chapter-progress-bar").style.width = `${scrollPercentage}%`;
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
        document.exitFullscreen();
    }
    setTimeout(() => {
        ScrubberManager.state.screenHeight = window.innerHeight;
        ScrubberManager.setScrubberMarkerActive(ScrubberManager.state.visibleImageIndex);
    }, 200);
}

function saveStateBeforeUnload() {
    if (State.currentManga) {
        ImageManager.saveScrollPosition();
    }
}

// Theme Management
const ThemeManager = {
    applyTheme: (theme) => {
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add(`${theme}-theme`);
        State.update("theme", theme);
    },
    loadTheme: () => {
        const savedTheme = State.theme || "dark";
        ThemeManager.applyTheme(savedTheme);
        DOM.get("theme-select").value = savedTheme;
    },
    handleThemeChange: () => {
        const selectedTheme = DOM.get("theme-select").value;
        ThemeManager.applyTheme(selectedTheme);
    },
    changeTheme: () => {
        const currentTheme = State.theme;
        const newTheme = currentTheme === "light" ? "dark" : "light";
        ThemeManager.applyTheme(newTheme);
        DOM.get("theme-select").value = newTheme;
    },
};

class MangaForm {
    constructor(formSelector) {
        this.form = DOM.query(formSelector);
    }

    getFormData() {
        return {
            title: DOM.query("#manga-title", this.form).value,
            description: DOM.query("#manga-description", this.form).value,
            imagesFullPath: DOM.query("#manga-images-full-path", this.form).value,
            totalImages: parseInt(DOM.query("#manga-total-images", this.form).value),
            userProvidedTotalChapters: parseInt(DOM.query("#manga-total-chapters", this.form).value)
        };
    }

    setFormData(data) {
        DOM.query("#manga-title", this.form).value = data.title || "";
        DOM.query("#manga-description", this.form).value = data.description || "";
        DOM.query("#manga-images-full-path", this.form).value = data.imagesFullPath || "";
        DOM.query("#manga-total-images", this.form).value = data.totalImages || 0;
        DOM.query("#manga-total-chapters", this.form).value = data.userProvidedTotalChapters || 0;
    }

    reset() {
        this.form.reset();
        delete this.form.dataset.editingMangaId;
    }

    setEditingMangaId(id) {
        this.form.dataset.editingMangaId = id;
    }

    getEditingMangaId() {
        return this.form.dataset.editingMangaId;
    }
}

// Sidebar management
const SidebarManager = {
    isVisible: false,
    toggleButton: null,
    sidebar: null,
    sidebarContent: null,

    init() {
        this.toggleButton = DOM.get('toggle-sidebar');
        this.sidebar = DOM.get('sidebar');
        this.sidebarContent = document.querySelector('.sidebar-content');
    },

    handleMouseMove(event) {
        const sidebar = document.querySelector('.sidebar');
        const sidebarStyle = window.getComputedStyle(sidebar);
        
        const sidebarWidthPx = parseFloat(sidebarStyle.width);
        const sidebarWidthPercent = sidebarWidthPx / window.innerWidth;
        
        const horizontalVisibilityRange = this.isVisible 
            ? (sidebarWidthPercent + 0.005) * window.innerWidth 
            : sidebarWidthPercent * window.innerWidth * 0.3;
        
        const isInHorizontalRange = event.clientX < horizontalVisibilityRange;

        const sidebarHeightPx = sidebar.offsetHeight;
        const sidebarHeightPercent = sidebarHeightPx / window.innerHeight;

        const verticalVisibilityRange = (sidebarHeightPercent + 0.01) * window.innerHeight;

        const isInVerticalRange = event.clientY < verticalVisibilityRange;

        const shouldBeVisible = isInHorizontalRange && isInVerticalRange;

        if (shouldBeVisible !== this.isVisible) {
            this.isVisible = shouldBeVisible;
            this.updateSidebarVisibility();
        }
    },
    
    timeoutId: null,
    updateSidebarVisibility() {
        if (this.isVisible || State.isChapterSelectorOpen) {
            clearTimeout(this.timeoutId);
            this.sidebar.classList.add('open');
        } else {
            this.timeoutId = setTimeout(() => {
                this.sidebar.classList.remove('open');
            }, 500);
        }
    },

    updateContentVisibility(isHomepage) {
        const settingsButton = this.sidebarContent.querySelector('#settings-button');
        if (!settingsButton) return;

        this.sidebarContent.querySelectorAll(':scope > *').forEach(element => {
            if (element !== settingsButton) {
                element.style.display = isHomepage ? 'none' : '';
            }
        });
    }
};


const handleMouseMove = (event) => {
    if (StateMachine.currentState !== "viewer") return;
    
    const visibilityRange = State.isNavVisible ? 75 : 55;
    const isInVerticalRange = event.clientY < visibilityRange;
    
    const bufferZone = window.innerWidth * 0.25;
    const isInHorizontalRange = event.clientX > bufferZone && event.clientX < (window.innerWidth - bufferZone);
    
    let shouldBeVisible = isInVerticalRange && isInHorizontalRange;
    
    if (ScrubberManager.isMouseOverScrubber()) {
        shouldBeVisible = false;
    }
    
    if (shouldBeVisible !== State.isNavVisible) {
        State.update("isNavVisible", shouldBeVisible);
        const navContainer = DOM.get("nav-container");
        if (navContainer) {
            navContainer.style.opacity = shouldBeVisible ? "1" : "0";
            navContainer.style.transform = shouldBeVisible ? "translateY(0)" : "translateY(-100%)";
        }
    }
};

const Shortcuts = {
    shortcuts: [
        { key: ["ArrowRight", "d"], action: "Next image", handler: () => ScrubberManager.navigateScrubber(1) },
        { key: ["ArrowLeft", "a"], action: "Previous image", handler: () => ScrubberManager.navigateScrubber(-1) },
        { key: ["clickUpper"], action: "Scroll up", handler: () => ImageManager.handleClick({ clientY: 0 }) },
        { key: ["clickLower"], action: "Scroll down", handler: () => ImageManager.handleClick({ clientY: window.innerHeight }) },
        { key: ["Alt + ArrowRight", "Alt + d"], action: "Next chapter", handler: ImageManager.loadNextChapter },
        { key: ["Alt + ArrowLeft", "Alt + a"], action: "Previous chapter", handler: ImageManager.loadPreviousChapter },
        { key: ["h"], action: "Go to first chapter", handler: ImageManager.goToFirstChapter },
        { key: ["l"], action: "Go to last chapter", handler: ImageManager.goToLastChapter },
        { key: ["+"], action: "Zoom in", handler: ZoomManager.zoomIn },
        { key: ["-"], action: "Zoom out", handler: ZoomManager.zoomOut },
        { key: ["="], action: "Reset zoom", handler: ZoomManager.resetZoom },
        { key: ["f"], action: "Toggle fullscreen", handler: toggleFullScreen },
        { key: ["t"], action: "Change theme", handler: ThemeManager.changeTheme },
        { key: ["r"], action: "Reload current chapter", handler: ImageManager.loadImages },
        { key: ["Shift + S"], action: "Open settings", handler: SettingsManager.openSettings },
        { key: ["Escape"], action: "Return to home", handler: returnToHome }
    ],

    handleShortcuts: (event) => {
        if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.ctrlKey || (!State.currentManga && event.key === "r")) return;
        
        const key = event.altKey ? `Alt + ${event.key}` : event.shiftKey ? `Shift + ${event.key}` : event.key;
        const shortcut = Shortcuts.shortcuts.find(s => s.key.includes(key));
        if (shortcut) {
            shortcut.handler();
            event.preventDefault();
        }
    },

    showShortcutsHelp: () => {
        const shortcutsHTML = Shortcuts.shortcuts.map(shortcut => {
            const keys = shortcut.key.map(k => 
                k === "ArrowRight" ? "→" : 
                k === "ArrowLeft" ? "←" :  
                k === "Alt + ArrowRight" ? "Alt + →" : 
                k === "Alt + ArrowLeft" ? "Alt + ←" : 
                k === "clickLower" ? "Click lower half of screen" :
                k === "clickUpper" ? "Click upper half of screen" :
                k.replace(/\+/g, " + ")
            ).join(" or ");
            return `<tr><td>${keys}</td><td>${shortcut.action}</td></tr>`;
        }).join("");

        const modal = document.createElement("div");
        modal.className = "modal fade";
        modal.id = "shortcuts-modal";
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Shortcuts</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <table class='table'>
                            <thead>
                                <tr>
                                    <th>Shortcut</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${shortcutsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const modalElement = new bootstrap.Modal(DOM.get("shortcuts-modal"));
        modalElement.show();

        DOM.get("shortcuts-modal").addEventListener("hidden.bs.modal", function (e) {
            document.body.classList.add("modal-open");
            DOM.get("shortcuts-modal").remove();
        });
    }
};

const handleScroll = Utils.debounce(() => {
    ImageManager.saveScrollPosition();
    ImageManager.handleScroll();
}, 200);

// Event Listeners
addListeners([
    [window, "scroll", handleScroll, { passive: true }],
    [document, "mousemove", (e) => {
        handleMouseMove(e);
        SidebarManager.handleMouseMove(e);
    }],
    [document, "keydown", Shortcuts.handleShortcuts],
    [document, "visibilitychange", saveStateBeforeUnload],
    [window, "beforeunload", saveStateBeforeUnload],
    [window, "scroll", updateProgressBar],
    ["first-button", "click", ImageManager.goToFirstChapter],
    ["prev-button", "click", ImageManager.loadPreviousChapter],
    ["next-button", "click", ImageManager.loadNextChapter],
    ["last-button", "click", ImageManager.goToLastChapter],
    ["chapter-selector", "change", ChapterManager.jumpToChapter],
    ["zoom-in-button", "click", ZoomManager.zoomIn],
    ["zoom-out-button", "click", ZoomManager.zoomOut],
    ["zoom-reset-button", "click", ZoomManager.resetZoom],
    ["fullscreen-button", "click", toggleFullScreen],
    ["return-to-home", "click", returnToHome],
    ["settings-button", "click", SettingsManager.openSettings],
    ["add-manga-btn", "click", () => MangaManager.openMangaModal()],
    ["settings-modal", "show.bs.modal", SettingsManager.populateSettings],
    ["shortcuts-help-button", "click", Shortcuts.showShortcutsHelp],
    ["theme-select", "change", ThemeManager.handleThemeChange],
    ["save-settings-btn", "click", SettingsManager.saveSettings],
    ["save-manga-btn", "click", MangaManager.saveManga],
    ["chapter-selector", "focus", (e) => handleChapterSelector(e, 'focus')],
    ["chapter-selector", "blur", (e) => handleChapterSelector(e, 'blur')],
    ["chapter-selector", "click", (e) => handleChapterSelector(e, 'click')]
]);

let justOpened = false;
const updateState = isOpen => {
    State.update("isChapterSelectorOpen", isOpen);
    SidebarManager.updateSidebarVisibility();
};

const handleChapterSelector = (event, action) => {
    if (action === 'focus') {
        updateState(true);
        justOpened = true;
        setTimeout(() => justOpened = false, 300);
    } else if (action === 'blur') {
        updateState(false);
    } else if (action === 'click') {
        const isOpen = State.isChapterSelectorOpen;
        if (isOpen && !justOpened) {
            updateState(false);
            DOM.get("chapter-selector").blur();
            event.preventDefault();
        } else if (!isOpen) {
            updateState(true);
        }
    }
};

addListener("manga-list", "click", (event) => {
    const card = event.target.closest(".manga-card");
    if (!card) return;
    const mangaId = parseInt(card.dataset.mangaId);
    const manga = State.mangaList.find((manga) => manga.id === mangaId);
    if (event.target.closest(".edit-btn")) {
        MangaManager.openMangaModal(manga);
    } else if (event.target.closest(".delete-btn")) {
        MangaManager.deleteManga(mangaId);
    } else {
        MangaManager.loadManga(manga);
    }
});

// Initialization
function initializeApp() {
    ThemeManager.loadTheme();
    MangaManager.renderMangaList();
    triggerAnimations();
    SidebarManager.init();
    StateMachine.updateUI();
    Utils.toggleSpinner(false);
}

Utils.promptForPassword(); // Put your password's SHA256 hash inside the brackets in quotes to use the password feature
