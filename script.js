(function() {
    // Constants and DOM Elements
    const DOM = (() => {
        const elements = {};
        return {
            get: (id) => {
                if (!elements[id]) {
                    elements[id] = document.getElementById(id);
                }
                return elements[id];
            }
        };
    })();

    // State Management
    const AppState = {
        config: {
            pagesPerChapter: parseInt(localStorage.getItem('pagesPerChapter')) || 0,
            totalPages: parseInt(localStorage.getItem('totalPages')) || 0,
            get totalChapters() { return Math.ceil(this.totalPages / this.pagesPerChapter); }
        },
        currentManga: null,
        theme: JSON.parse(localStorage.getItem('theme')) || 'dark',
        isChapterSelectorOpen: false,
        isNavVisible: false,
        mangaList: JSON.parse(localStorage.getItem('mangaList')) || [],
        mangaSettings: JSON.parse(localStorage.getItem('mangaSettings')) || {},
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
        },
        update(key, value) {
            this[key] = value;
            localStorage.setItem(key, JSON.stringify(value));
        }
    };

    // Utility Functions
    class Utils {
        static toggleSpinner(show) {
            DOM.get('loading-spinner').style.display = show ? 'block' : 'none';
        }

        static updatePageRange(start, end) {
            DOM.get('page-range').textContent = `Showing pages ${start} - ${end} of ${AppState.config.totalPages}`;
        }

        static debounce(func, delay) {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(this, args), delay);
            };
        }

        static promptForPassword() {
            const password = prompt('Enter the password:');
            if (CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex) === 'Your SHA256 hash of the password') {
                initializeApp();
            } else {
                alert('Incorrect password. Please try again.');
                Utils.promptForPassword();
            }
        }

        static getChapterBounds(chapter) {
            return {
                start: chapter * AppState.config.pagesPerChapter,
                end: Math.min((chapter + 1) * AppState.config.pagesPerChapter, AppState.config.totalPages)
            };
        }

        static saveMangaSettings(mangaId, settings) {
            AppState.mangaSettings[mangaId] = settings;
            AppState.update('mangaSettings', AppState.mangaSettings);
        }

        static loadMangaSettings(mangaId) {
            return AppState.mangaSettings[mangaId] || {
                currentChapter: 0,
                scrollPosition: 0,
                zoomLevel: 1
            };
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
            if (!manga || typeof manga !== 'object' || !manga.id) {
                console.error('Invalid manga object:', manga);
                return null;
            }
            const card = document.createElement('div');
            card.className = 'col-md-4 col-sm-6';
            card.innerHTML = `
                <div class="card manga-card" data-manga-id="${manga.id}">
                    <img src="${manga.imagePath}1.jpg" class="card-img-top" alt="${manga.title}">
                    <div class="card-body">
                        <h5 class="card-title">${manga.title}</h5>
                        <p class="card-text">${manga.description}</p>
                    </div>
                    <button class="edit-btn"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            return card;
        },

        renderMangaList: () => {
            const mangaListElement = DOM.get('manga-list');
            mangaListElement.innerHTML = '';
            AppState.mangaList.forEach((manga, id) => {
                const card = MangaManager.createMangaCard(manga);
                mangaListElement.appendChild(card);
            });
            MangaManager.initSortable();
        },

        initSortable: () => {
            new Sortable(DOM.get('manga-list'), {
                animation: 150,
                onEnd: () => {
                    const newOrder = Array.from(DOM.get('manga-list').children).map(card => 
                        AppState.mangaList.find(manga => manga.id === parseInt(card.querySelector('.manga-card').dataset.mangaId))
                    );
                    AppState.update('mangaList', newOrder);
                    MangaManager.saveMangaList();
                }
            });
        },

        addManga: (manga) => {
            manga.id = Date.now();
            AppState.mangaList.push(manga);
            AppState.update('mangaList', AppState.mangaList);
            MangaManager.renderMangaList();
        },

        editManga: (id, updatedManga) => {
            const index = AppState.mangaList.findIndex(manga => manga.id === id);
                if (index !== -1) {
                    AppState.mangaList[index] = { ...AppState.mangaList[index], ...updatedManga };
                    AppState.update('mangaList', AppState.mangaList);
                    MangaManager.renderMangaList();
            }
        },

        deleteManga: (id) => {
            AppState.mangaList = AppState.mangaList.filter(manga => manga.id !== id);
            AppState.update('mangaList', AppState.mangaList);
            MangaManager.renderMangaList();
        },

        saveMangaList: () => {
            localStorage.setItem('mangaList', JSON.stringify(AppState.mangaList));
        },

        loadManga: (manga) => {
            if (AppState.currentManga) {
                PageManager.saveScrollPosition();
            }
            AppState.update('currentManga', manga);
            AppState.config.totalPages = manga.totalPages;
            AppState.config.pagesPerChapter = manga.pagesPerChapter;
            showViewer();
            PageManager.loadCurrentPage();
            ZoomManager.applyZoom();

        }
    };

    function toggleProgressBarVisibility(visible) {
        const progressBar = DOM.get('chapter-progress-bar');
        if (progressBar) {
            progressBar.style.display = visible ? 'block' : 'none';
        }
    }

    function clearMangaState() {
        if (AppState.currentManga) {
            PageManager.saveScrollPosition();
        }
        AppState.update('currentManga', null);
        DOM.get('page-container').scrollTop = 0;
    }

    const AppStateMachine = {
        currentState: 'homepage',
        transitions: {
            homepage: ['viewer'],
            viewer: ['homepage']
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
            const homepageContainer = DOM.get('homepage-container');
            const pageContainer = DOM.get('page-container');
            const navContainer = DOM.get('nav-container');
            switch(this.currentState) {
                case 'homepage':
                    if (homepageContainer) homepageContainer.style.display = 'block';
                    if (pageContainer) pageContainer.style.display = 'none';
                    if (navContainer) navContainer.style.display = 'none';
                    toggleProgressBarVisibility(false);
                    break;
                case 'viewer':
                    if (homepageContainer) homepageContainer.style.display = 'none';
                    if (pageContainer) pageContainer.style.display = 'block';
                    if (navContainer) navContainer.style.display = 'flex';
                    toggleProgressBarVisibility(true);
                    break;
            }
        }
    };

    function showHomepage() {
        if (AppStateMachine.currentState !== 'homepage') {
            if (AppState.currentManga) {
                PageManager.saveScrollPosition();
            }
            AppState.update('currentManga', null);
            AppStateMachine.transition('homepage');
        }
    }


    function showViewer() {
        if (AppStateMachine.currentState !== 'viewer') {
            AppStateMachine.transition('viewer');
        }
    }


    function backToHomepage() {
        clearMangaState();
        showHomepage();
    }

    const lazyLoadImages = () => {
        const images = document.querySelectorAll('img[data-src]');
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const loadImage = (image) => {
            image.src = image.dataset.src;
            image.removeAttribute('data-src');
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        images.forEach(img => observer.observe(img));
    };


    // Page Management
    const PageManager = {
        loadPages: () => {
            if (!AppState.currentManga) {
                console.error("No manga selected");
                return;
            }
            const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
            const { start, end } = Utils.getChapterBounds(mangaSettings.currentChapter);
            DOM.get('page-container').innerHTML = '';
            Utils.toggleSpinner(true);
            let loadedImages = 0;
            const fragment = document.createDocumentFragment();
            const totalImagesToLoad = end - start;

            // Remember the last successful format
            let lastSuccessfulFormat = 'jpg';
            const formatPriority = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

            const loadImage = (index) => {
                const img = document.createElement('img');
                img.dataset.originalHeight = 0;
                img.loading = 'lazy';

                const tryLoadImage = (formats) => {
                    if (formats.length === 0) {
                        console.error(`Failed to load image for index: ${index}`);
                        onImageLoad();
                        return;
                    }

                    const format = formats.shift();
                    img.src = `${AppState.currentManga.imagePath}${index}.${format}`;

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
                        ZoomManager.applyZoom();
                        PageManager.restoreScrollPosition();
                    }
                };

                img.addEventListener('mousedown', (event) => LightboxManager.handleMouseDown(event, img));
                img.addEventListener('mouseup', LightboxManager.handleMouseUp);
                img.addEventListener('click', PageManager.handleClick);
                fragment.appendChild(img);

                const formatsToTry = [lastSuccessfulFormat, ...formatPriority.filter(f => f !== lastSuccessfulFormat)];
                tryLoadImage(formatsToTry);
            };

            for (let i = start; i < end; i++) {
                loadImage(i + 1);
            }

            DOM.get('page-container').appendChild(fragment);
            lazyLoadImages();
            Utils.updatePageRange(start + 1, end);
            ChapterManager.updateChapterSelector();
            
            // Preload next chapter's images
            const nextChapterStart = end;
            const nextChapterEnd = Math.min(nextChapterStart + AppState.config.pagesPerChapter, AppState.config.totalPages);
            PageManager.preloadImages(nextChapterStart, nextChapterEnd);
        },

        preloadImages: (startIndex, endIndex) => {
            if (!AppState.currentManga) return;
            for (let i = startIndex; i < endIndex; i++) {
                const img = new Image();
                img.src = `${AppState.currentManga.imagePath}${i + 1}.jpg`;
            }
        },
        
        changeChapter: (direction) => {
            Utils.withCurrentManga((mangaSettings) => {
                const newChapter = mangaSettings.currentChapter + direction;
                if (newChapter >= 0 && newChapter < AppState.config.totalChapters) {
                    mangaSettings.currentChapter = newChapter;
                    mangaSettings.scrollPosition = 0;
                    Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
                    PageManager.loadPages();
                }
            });
        },
        
        loadNextPages: () => PageManager.changeChapter(1),
        loadPreviousPages: () => PageManager.changeChapter(-1),
        goToFirstPages: () => {
            Utils.withCurrentManga((mangaSettings) => {
                mangaSettings.currentChapter = 0;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
                PageManager.loadPages();
                PageManager.saveCurrentPage();
            });
        },

        goToLastPages: () => {
            Utils.withCurrentManga((mangaSettings) => {
                mangaSettings.currentChapter = AppState.config.totalChapters - 1;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
                PageManager.loadPages();
                PageManager.saveCurrentPage();
            });
        },
        
        saveCurrentPage: () => {
            Utils.withCurrentManga((mangaSettings) => {
                mangaSettings.scrollPosition = DOM.get('page-container').scrollTop;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
            });
        },

        loadCurrentPage: () => {
            Utils.withCurrentManga((mangaSettings) => {
                ChapterManager.updateChapterSelector();
                PageManager.loadPages();
                // Use requestAnimationFrame to ensure DOM is updated before scrolling
                requestAnimationFrame(() => {
                    DOM.get('page-container').scrollTop = mangaSettings.scrollPosition || 0;
                });
            });
        },

        restoreScrollPosition: () => {
            Utils.withCurrentManga((mangaSettings) => {
                requestAnimationFrame(() => {
                    DOM.get('page-container').scrollTop = mangaSettings.scrollPosition || 0;
                });
            });
        },

        saveScrollPosition: () => {
            Utils.withCurrentManga((mangaSettings) => {
                mangaSettings.scrollPosition = DOM.get('page-container').scrollTop;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
            });
        },

        handleClick: (event) => {
            const clickY = event.clientY;
            const viewportHeight = window.innerHeight;
            const scrollAmount = viewportHeight / 2;
            const duration = 200;
            
            let start = null;
            const container = DOM.get('page-container');
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
        adjustZoom: (newZoomLevel) => {
            Utils.withCurrentManga((mangaSettings) => {
                const container = DOM.get('page-container');
                const oldScrollTop = container.scrollTop;
                const oldHeight = container.scrollHeight;

                mangaSettings.zoomLevel = newZoomLevel;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
                
                ZoomManager.applyZoom();

                const newHeight = container.scrollHeight;
                const newScrollTop = (oldScrollTop / oldHeight) * newHeight;
                container.scrollTop = newScrollTop;
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
                const images = DOM.get('page-container').getElementsByTagName('img');
                for (let img of images) {
                    const originalHeight = img.dataset.originalHeight;
                    const newHeight = originalHeight * mangaSettings.zoomLevel;
                    img.style.height = `${newHeight}px`;
                }
                const zoomPercentage = Math.round(mangaSettings.zoomLevel * 100);
                DOM.get('zoom-level').textContent = `Zoom: ${zoomPercentage}%`;
            });
        }
    };
    // Chapter Management
    const ChapterManager = {
        jumpToChapter: () => {
            if (!AppState.currentManga) return;
            const selectedChapter = parseInt(DOM.get('chapter-selector').value);
            if (selectedChapter >= 0 && selectedChapter < AppState.config.totalChapters) {
                const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
                mangaSettings.currentChapter = selectedChapter;
                mangaSettings.scrollPosition = 0;
                Utils.saveMangaSettings(AppState.currentManga.id, mangaSettings);
                PageManager.loadPages();
                DOM.get('chapter-selector').blur();
                DOM.get('chapter-progress-bar').style.width = '0%';
                DOM.get('page-container').scrollTop = 0;
            }
        },

        updateChapterSelector: () => {
            Utils.withCurrentManga((mangaSettings) => {
                DOM.get('chapter-selector').innerHTML = Array.from({ length: AppState.config.totalChapters }, (_, i) => 
                    `<option value="${i}" ${i === mangaSettings.currentChapter ? 'selected' : ''}>Chapter ${i}</option>`
                ).join('');
            });
        }
    };

    // Lightbox Management
    const LightboxManager = {
        currentImageIndex: 0,
        openLightbox: (imgSrc) => {
            if (!AppState.lightbox.element) {
                LightboxManager.createLightbox();
            }
            const images = Array.from(DOM.get('page-container').getElementsByTagName('img'));
            LightboxManager.currentImageIndex = images.findIndex(img => img.src === imgSrc);
            LightboxManager.loadCurrentImage();
            AppState.lightbox.element.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            LightboxManager.updateButtonVisibility();
        },
        
        loadCurrentImage: () => {
            const images = Array.from(DOM.get('page-container').getElementsByTagName('img'));
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
            const images = Array.from(DOM.get('page-container').getElementsByTagName('img'));
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
            AppState.lightbox.element.style.display = 'none';
            AppState.lightbox.img.style.transform = 'translate(0, 0) scale(1)';
            AppState.lightbox.currentScale = 1;
            AppState.lightbox.currentTranslateX = 0;
            AppState.lightbox.currentTranslateY = 0;
            document.body.style.overflow = 'auto';
        },
        
        createLightbox: () => {
            AppState.lightbox.element = document.createElement('div');
            AppState.lightbox.element.id = 'lightbox';
            AppState.lightbox.element.addEventListener('click', LightboxManager.handleLightboxClick);
            
            AppState.lightbox.img = document.createElement('img');
            AppState.lightbox.img.addEventListener('mousedown', LightboxManager.startDrag);
            AppState.lightbox.img.addEventListener('mousemove', LightboxManager.drag);
            AppState.lightbox.img.addEventListener('mouseup', LightboxManager.endDrag);
            AppState.lightbox.img.addEventListener('mouseleave', LightboxManager.endDrag);
            AppState.lightbox.img.addEventListener('touchstart', LightboxManager.startDrag);
            AppState.lightbox.img.addEventListener('touchmove', LightboxManager.drag);
            AppState.lightbox.img.addEventListener('touchend', LightboxManager.endDrag);
            AppState.lightbox.img.addEventListener('wheel', LightboxManager.zoom);
            
            const closeButton = document.createElement('span');
            closeButton.id = 'lightbox-close';
            closeButton.innerHTML = '&times;';
            closeButton.addEventListener('click', LightboxManager.closeLightbox);
            
            AppState.lightbox.prevButton = document.createElement('span');
            AppState.lightbox.prevButton.id = 'lightbox-prev';
            AppState.lightbox.prevButton.innerHTML = '&#10094;';
            AppState.lightbox.prevButton.addEventListener('click', LightboxManager.prevImage);
            
            AppState.lightbox.nextButton = document.createElement('span');
            AppState.lightbox.nextButton.id = 'lightbox-next';
            AppState.lightbox.nextButton.innerHTML = '&#10095;';
            AppState.lightbox.nextButton.addEventListener('click', LightboxManager.nextImage);
            
            AppState.lightbox.element.appendChild(AppState.lightbox.img);
            AppState.lightbox.element.appendChild(closeButton);
            AppState.lightbox.element.appendChild(AppState.lightbox.prevButton);
            AppState.lightbox.element.appendChild(AppState.lightbox.nextButton);
            document.body.appendChild(AppState.lightbox.element);
        },
        
        prevImage: () => {
            LightboxManager.skipToNextValidImage(-1);
            LightboxManager.resetZoomAndPosition();
        },

        nextImage: () => {
            LightboxManager.skipToNextValidImage(1);
            LightboxManager.resetZoomAndPosition();
        },

        updateButtonVisibility: () => {
            const images = Array.from(DOM.get('page-container').getElementsByTagName('img'));
            AppState.lightbox.prevButton.style.display = LightboxManager.currentImageIndex > 0 ? 'inline-flex' : 'none';
            AppState.lightbox.nextButton.style.display = LightboxManager.currentImageIndex < images.length - 1 ? 'inline-flex' : 'none';
        },

        resetZoomAndPosition: () => {
            AppState.lightbox.img.style.transform = 'translate(0, 0) scale(1)';
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
            if (event.target.tagName === 'IMG' && event.target.closest('#lightbox')) {
                AppState.lightbox.isDragging = true;
                AppState.lightbox.startX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
                AppState.lightbox.startY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;
                AppState.lightbox.startTranslateX = AppState.lightbox.currentTranslateX;
                AppState.lightbox.startTranslateY = AppState.lightbox.currentTranslateY;
                AppState.lightbox.img.style.cursor = 'grabbing';
            }
        },
        
        drag: (event) => {
            event.preventDefault();
            if (AppState.lightbox.isDragging) {
                const currentX = event.type.startsWith('touch') ? event.touches[0].clientX : event.clientX;
                const currentY = event.type.startsWith('touch') ? event.touches[0].clientY : event.clientY;
                AppState.lightbox.currentTranslateX = AppState.lightbox.startTranslateX + currentX - AppState.lightbox.startX;
                AppState.lightbox.currentTranslateY = AppState.lightbox.startTranslateY + currentY - AppState.lightbox.startY;
                AppState.lightbox.img.style.transform = `translate(${AppState.lightbox.currentTranslateX}px, ${AppState.lightbox.currentTranslateY}px) scale(${AppState.lightbox.currentScale})`;
            }
        },
        
        endDrag: () => {
            if (AppState.lightbox.isDragging) {
                AppState.lightbox.isDragging = false;
                AppState.lightbox.img.style.cursor = 'grab';
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
        }
    };

    // Settings Management
    const SettingsManager = {
        openSettings: () => {
            if (!AppState.currentManga) {
                alert('Please select a manga first before opening settings.');
                return;
            }
            $('#settings-modal').modal('show');
            const mangaSettings = Utils.loadMangaSettings(AppState.currentManga.id);
            DOM.get('image-full-path').value = AppState.currentManga.imagePath;
            DOM.get('pages-per-chapter').value = AppState.currentManga.pagesPerChapter;
            DOM.get('total-pages').value = AppState.currentManga.totalPages;
        },
        
        saveSettings: () => {
            if (!AppState.currentManga) return;
            
            AppState.currentManga.imagePath = DOM.get('image-full-path').value;
            AppState.currentManga.pagesPerChapter = parseInt(DOM.get('pages-per-chapter').value);
            AppState.currentManga.totalPages = parseInt(DOM.get('total-pages').value);
            
            // Update manga in mangaList
            const index = AppState.mangaList.findIndex(manga => manga.id === AppState.currentManga.id);
            if (index !== -1) {
                AppState.mangaList[index] = AppState.currentManga;
            }
            
            // Save updated manga list
            localStorage.setItem('mangaList', JSON.stringify(AppState.mangaList));
            
            // Update CONFIG
            AppState.config.pagesPerChapter = AppState.currentManga.pagesPerChapter;
            AppState.config.totalPages = AppState.currentManga.totalPages;
            
            ThemeManager.handleThemeChange();
            
            $('#settings-modal').modal('hide');
            PageManager.loadPages();
            ChapterManager.updateChapterSelector();
        },
    };

    function updateProgressBar() {
        const container = DOM.get('page-container');
        const scrollPosition = container.scrollTop;
        const scrollHeight = container.scrollHeight - container.clientHeight;
        const scrollPercentage = (scrollPosition / scrollHeight) * 100;
        DOM.get('chapter-progress-bar').style.width = `${scrollPercentage}%`;
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
    document.addEventListener('visibilitychange', saveStateBeforeUnload);
    window.addEventListener('beforeunload', saveStateBeforeUnload);

    DOM.get('page-container').addEventListener('scroll', updateProgressBar);

    // Theme Management
    const ThemeManager = {
        applyTheme: (theme) => {
            document.body.classList.toggle('dark-theme', theme === 'dark');
            AppState.update('theme', theme);
        },
        
        loadTheme: () => {
            const savedTheme = AppState.theme || 'dark';
            ThemeManager.applyTheme(savedTheme);
            DOM.get('theme-select').value = savedTheme;
        },
        
        handleThemeChange: () => {
            const selectedTheme = DOM.get('theme-select').value;
            ThemeManager.applyTheme(selectedTheme);
        },

        toggleTheme: () => {
            const currentTheme = AppState.theme;
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            ThemeManager.applyTheme(newTheme);
            DOM.get('theme-select').value = newTheme;
        }
    };

    // Event Listeners
    document.addEventListener('mousemove', (event) => {
        const visibilityRange = AppState.isNavVisible ? 75 : 55;
        const isInRange = window.innerHeight - event.clientY < visibilityRange;
        const shouldBeVisible = isInRange || AppState.isChapterSelectorOpen;

        if (shouldBeVisible !== AppState.isNavVisible) {
            AppState.update('isNavVisible', shouldBeVisible);
            const navContainer = DOM.get('nav-container');
            if (navContainer) {
                navContainer.style.opacity = shouldBeVisible ? '1' : '0';
                navContainer.style.transform = shouldBeVisible ? 'translateY(0)' : 'translateY(100%)';
            }
        }
    });


    DOM.get('first-button').addEventListener('click', PageManager.goToFirstPages);
    DOM.get('prev-button').addEventListener('click', PageManager.loadPreviousPages);
    DOM.get('next-button').addEventListener('click', PageManager.loadNextPages);
    DOM.get('last-button').addEventListener('click', PageManager.goToLastPages);

    DOM.get('chapter-selector').addEventListener('change', ChapterManager.jumpToChapter);

    DOM.get('zoom-in-button').addEventListener('click', ZoomManager.zoomIn);
    DOM.get('zoom-out-button').addEventListener('click', ZoomManager.zoomOut);
    DOM.get('zoom-reset-button').addEventListener('click', ZoomManager.resetZoom);

    DOM.get('fullscreen-button').addEventListener('click', toggleFullScreen);
    DOM.get('settings-button').addEventListener('click', SettingsManager.openSettings);
    DOM.get('save-changes-btn').addEventListener('click', SettingsManager.saveSettings);
    DOM.get('back-to-home').addEventListener('click', backToHomepage);

    DOM.get('chapter-selector').addEventListener('focus', () => {
        AppState.update('isChapterSelectorOpen', true);
    });

    DOM.get('chapter-selector').addEventListener('blur', () => {
        AppState.update('isChapterSelectorOpen', false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT') return;
        
        switch (event.key) {
            case 'ArrowRight':
            case 'd':
                PageManager.loadNextPages();
                break;
            case 'ArrowLeft':
            case 'a':
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

    DOM.get('page-container').addEventListener('scroll', Utils.debounce(() => {
        PageManager.saveScrollPosition();
        updateProgressBar();
    }, 200), { passive: true });

    DOM.get('theme-select').addEventListener('change', ThemeManager.handleThemeChange);

    DOM.get('add-manga-btn').addEventListener('click', openAddModal);

    DOM.get('save-manga-btn').addEventListener('click', () => {
        const form = DOM.get('add-manga-form');
        const newManga = {
            title: form.querySelector('#manga-title').value,
            description: form.querySelector('#manga-description').value,
            imagePath: form.querySelector('#manga-image-path').value,
            totalPages: parseInt(form.querySelector('#manga-total-pages').value),
            pagesPerChapter: parseInt(form.querySelector('#manga-pages-per-chapter').value)
        };
        
        // Check if an existing manga is being edited
        const editingMangaId = form.dataset.editingMangaId ? parseInt(form.dataset.editingMangaId) : null;
        if (editingMangaId !== null) {
            MangaManager.editManga(editingMangaId, newManga);
            delete form.dataset.editingMangaId; // Clear the dataset property after editing
        } else {
            MangaManager.addManga(newManga);
        }
        
        $('#manga-modal').modal('hide');
        form.reset();
    });



    DOM.get('manga-list').addEventListener('click', (event) => {
        const card = event.target.closest('.manga-card');
        if (!card) return;

        const mangaId = parseInt(card.dataset.mangaId);
        const manga = AppState.mangaList.find(manga => manga.id === mangaId);
        
        if (event.target.closest('.edit-btn')) {
            openEditModal(manga);
        } else if (event.target.closest('.delete-btn')) {
            if (confirm('Are you sure you want to delete this manga?')) {
                MangaManager.deleteManga(mangaId);
            }
        } else {
            MangaManager.loadManga(manga);
        }
    });

    function openEditModal(manga) {
        const form = DOM.get('add-manga-form');
        form.querySelector('#manga-title').value = manga.title;
        form.querySelector('#manga-description').value = manga.description;
        form.querySelector('#manga-image-path').value = manga.imagePath;
        form.querySelector('#manga-total-pages').value = manga.totalPages;
        form.querySelector('#manga-pages-per-chapter').value = manga.pagesPerChapter;
        form.dataset.editingMangaId = manga.id;

        document.querySelector('#manga-modal .modal-title').innerText = 'Edit Manga';
        $('#manga-modal').modal('show');
    }

    function openAddModal() {
        const form = DOM.get('add-manga-form');
        form.reset();
        delete form.dataset.editingMangaId;

        document.querySelector('#manga-modal .modal-title').innerText = 'Add New Manga';
        $('#manga-modal').modal('show');
    }

    // Initialize the application
    function initializeApp() {
        ThemeManager.loadTheme();
        ZoomManager.applyZoom();
        MangaManager.renderMangaList();
        if (AppStateMachine.currentState !== 'homepage') {
            showHomepage();
        }
        ChapterManager.updateChapterSelector();
        
        document.body.style.visibility = 'visible';
        
        Utils.toggleSpinner(false);
    }

    initializeApp(); // Remove this line, and un-comment the below to use the password feature
    // Utils.promptForPassword();

})();
