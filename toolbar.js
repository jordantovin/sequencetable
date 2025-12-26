// toolbar.js - Handles all toolbar button functionality

(function() {
    'use strict';

    // ===== STATE MANAGEMENT =====
    const state = {
        history: [],
        historyIndex: -1,
        maxHistorySize: 50,
        isRestoring: false // Flag to prevent saving during undo/redo
    };

    // ===== INITIALIZATION =====
    function init() {
        setupEventListeners();
        setupEditableTitle();
        // Delay initial save to let photos load
        setTimeout(() => {
            saveState();
            updateUndoRedoButtons();
        }, 500);
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Search
        document.querySelector('.toolbar-icon[title="Search"]').addEventListener('click', handleSearch);
        
        // Undo/Redo
        document.querySelector('.toolbar-icon[title="Undo"]').addEventListener('click', handleUndo);
        document.querySelector('.toolbar-icon[title="Redo"]').addEventListener('click', handleRedo);
        
        // Upload/Download
        document.querySelector('.toolbar-icon[title="Upload layout"]').addEventListener('click', handleUpload);
        document.querySelector('.toolbar-icon[title="Download layout"]').addEventListener('click', handleDownload);
        
        // Reset/Refresh
        document.querySelector('.toolbar-icon[title="Reset"]').addEventListener('click', handleReset);
        
        // Print
        document.querySelector('.toolbar-icon[title="Print"]').addEventListener('click', handlePrint);

        // Keyboard shortcuts are handled by keyboard-shortcuts.js
        // But we keep these as backup
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    // ===== EDITABLE TITLE FUNCTIONALITY =====
    function setupEditableTitle() {
        const titleElement = document.querySelector('.doc-title');
        
        titleElement.addEventListener('click', function() {
            enableTitleEditing(this);
        });
        
        titleElement.style.cursor = 'text';
        titleElement.style.padding = '4px 8px';
        titleElement.style.borderRadius = '3px';
        titleElement.style.transition = 'background-color 0.2s';
        
        titleElement.addEventListener('mouseenter', function() {
            if (!this.isContentEditable) {
                this.style.backgroundColor = 'rgba(0,0,0,0.05)';
            }
        });
        
        titleElement.addEventListener('mouseleave', function() {
            if (!this.isContentEditable) {
                this.style.backgroundColor = 'transparent';
            }
        });
    }

    function enableTitleEditing(element) {
        if (element.isContentEditable) return;
        
        const originalText = element.textContent;
        
        element.contentEditable = true;
        element.style.backgroundColor = 'white';
        element.style.outline = '2px solid #4285f4';
        element.style.outlineOffset = '2px';
        element.style.whiteSpace = 'nowrap';
        element.style.overflow = 'hidden';
        
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        element.focus();
        
        const finishEditing = () => {
            element.contentEditable = false;
            element.style.backgroundColor = 'transparent';
            element.style.outline = 'none';
            
            let newText = element.textContent.trim();
            newText = newText.replace(/[\r\n]+/g, ' ');
            
            if (!newText) {
                element.textContent = originalText;
                return;
            }
            
            newText = newText.replace(/[<>:"/\\|?*]/g, '');
            
            if (newText.length > 100) {
                newText = newText.substring(0, 100);
            }
            
            element.textContent = newText;
        };
        
        const keydownHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                element.blur();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                element.textContent = originalText;
                element.blur();
            }
        };
        
        element.addEventListener('keydown', keydownHandler);
        
        const blurHandler = () => {
            finishEditing();
            element.removeEventListener('keydown', keydownHandler);
        };
        
        element.addEventListener('blur', blurHandler, { once: true });
    }

    // ===== SEARCH FUNCTIONALITY =====
    function handleSearch() {
        const query = prompt('Search for photo by filename:');
        if (!query) return;

        const photos = document.querySelectorAll('.photo-card');
        let found = false;

        photos.forEach(photo => {
            const filename = photo.querySelector('.photo-filename')?.textContent || '';
            const caption = photo.querySelector('.photo-caption')?.textContent || '';
            
            if (filename.toLowerCase().includes(query.toLowerCase()) ||
                caption.toLowerCase().includes(query.toLowerCase())) {
                photo.style.boxShadow = '0 0 0 4px #4285f4';
                photo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                found = true;
                
                setTimeout(() => {
                    photo.style.boxShadow = '';
                }, 2000);
            }
        });

        if (!found) {
            alert(`No photos found matching "${query}"`);
        }
    }

    // ===== UNDO/REDO FUNCTIONALITY =====
    function saveState() {
        // Don't save while restoring
        if (state.isRestoring) return;
        
        const container = document.getElementById('photo-container');
        const photos = Array.from(container.querySelectorAll('.photo-card')).map(photo => {
            const img = photo.querySelector('img');
            const frame = photo.querySelector('.photo-frame');
            
            return {
                id: photo.dataset.id || 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                src: img?.src || '',
                photographer: photo.querySelector('.photo-caption')?.textContent || '',
                
                // Transform-based positioning - THIS IS KEY
                x: parseFloat(photo.dataset.x) || 0,
                y: parseFloat(photo.dataset.y) || 0,
                rotation: parseFloat(photo.dataset.rotation) || 0,
                
                // Actual image dimensions
                imgWidth: img?.style.width || '',
                imgHeight: img?.style.height || '',
                
                // Frame data from the frame element itself
                frameStyle: frame ? {
                    padding: frame.style.padding || '',
                    background: frame.style.background || '',
                    boxShadow: frame.style.boxShadow || '',
                    frameThickness: frame.style.getPropertyValue('--frame-thickness') || ''
                } : null,
                
                // Z-index for layering
                zIndex: photo.style.zIndex || '1000',
                
                // Selection state
                isSelected: photo.classList.contains('selected')
            };
        });

        // Get wall state - check actual display style, not class
        const wall = document.getElementById('wall');
        const wallState = {
            visible: wall.style.display !== 'none' && wall.style.display !== '',
            width: document.getElementById('wallWidth').value,
            height: document.getElementById('wallHeight').value,
            unit: document.getElementById('wallUnit').value,
            color: document.getElementById('wallColor').value
        };

        const newState = {
            photos: photos,
            wall: wallState,
            documentTitle: document.querySelector('.doc-title').textContent,
            timestamp: Date.now()
        };

        // Check if this state is meaningfully different from the last one
        const lastState = state.history[state.historyIndex];
        if (lastState && JSON.stringify(newState.photos) === JSON.stringify(lastState.photos) &&
            JSON.stringify(newState.wall) === JSON.stringify(lastState.wall)) {
            return; // Skip saving if nothing changed
        }

        // If we're not at the end of history, remove everything after current index
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }

        // Add new state
        state.history.push(newState);

        // Maintain max history size
        if (state.history.length > state.maxHistorySize) {
            state.history.shift();
        } else {
            state.historyIndex++;
        }

        updateUndoRedoButtons();
    }

    function handleUndo() {
        if (state.historyIndex <= 0) return;

        state.historyIndex--;
        restoreState(state.history[state.historyIndex]);
        updateUndoRedoButtons();
    }

    function handleRedo() {
        if (state.historyIndex >= state.history.length - 1) return;

        state.historyIndex++;
        restoreState(state.history[state.historyIndex]);
        updateUndoRedoButtons();
    }

    function restoreState(savedState) {
        state.isRestoring = true;

        const container = document.getElementById('photo-container');
        container.innerHTML = '';

        savedState.photos.forEach(photoData => {
            const photo = createPhotoCard(photoData);
            container.appendChild(photo);
        });

        // Restore wall state
        if (savedState.wall) {
            document.getElementById('wallWidth').value = savedState.wall.width;
            document.getElementById('wallHeight').value = savedState.wall.height;
            document.getElementById('wallUnit').value = savedState.wall.unit;
            document.getElementById('wallColor').value = savedState.wall.color;

            const wall = document.getElementById('wall');
            const buildBtn = document.getElementById('buildWallBtn');
            const eraseBtn = document.getElementById('eraseWallBtn');

            if (savedState.wall.visible) {
                wall.style.display = 'block';
                buildBtn.style.display = 'none';
                eraseBtn.style.display = 'flex';
                
                // Trigger wall update to recalculate dimensions
                if (window.updateWall) {
                    window.updateWall();
                }
            } else {
                wall.style.display = 'none';
                buildBtn.style.display = 'flex';
                eraseBtn.style.display = 'none';
            }
        }

        // Restore document title
        if (savedState.documentTitle) {
            document.querySelector('.doc-title').textContent = savedState.documentTitle;
        }

        setTimeout(() => {
            state.isRestoring = false;
        }, 100);
    }

    function createPhotoCard(photoData) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        if (photoData.isSelected) {
            card.classList.add('selected');
        }

        card.dataset.id = photoData.id;
        
        // CRITICAL: Set transform data attributes
        card.dataset.x = photoData.x;
        card.dataset.y = photoData.y;
        card.dataset.rotation = photoData.rotation;

        const frame = document.createElement('div');
        frame.className = 'photo-frame';

        const img = document.createElement('img');
        img.src = photoData.src;
        img.alt = photoData.photographer;
        
        if (photoData.imgWidth) img.style.width = photoData.imgWidth;
        if (photoData.imgHeight) img.style.height = photoData.imgHeight;

        frame.appendChild(img);

        // Restore frame styling
        if (photoData.frameStyle) {
            if (photoData.frameStyle.padding) frame.style.padding = photoData.frameStyle.padding;
            if (photoData.frameStyle.background) frame.style.background = photoData.frameStyle.background;
            if (photoData.frameStyle.boxShadow) frame.style.boxShadow = photoData.frameStyle.boxShadow;
            if (photoData.frameStyle.frameThickness) {
                frame.style.setProperty('--frame-thickness', photoData.frameStyle.frameThickness);
            }
        }

        card.appendChild(frame);

        // Caption
        const caption = document.createElement('div');
        caption.className = 'photo-caption';
        caption.textContent = photoData.photographer;
        
        // Check if names are visible
        const namesAreVisible = window.areNamesVisible ? window.areNamesVisible() : false;
        caption.style.display = namesAreVisible ? '' : 'none';
        
        card.appendChild(caption);

        // Dimensions label with two spans
        const dim = document.createElement('div');
        dim.className = 'photo-dimensions';
        
        const pictureDimSpan = document.createElement('span');
        pictureDimSpan.className = 'picture-dimensions';
        pictureDimSpan.style.cssText = `
            cursor: pointer;
            display: block;
            padding: 2px 4px;
            border-radius: 4px;
            transition: background 0.2s;
        `;
        pictureDimSpan.title = 'Click to edit picture dimensions';
        
        // Add hover effect
        pictureDimSpan.addEventListener('mouseenter', () => {
            if (!pictureDimSpan.querySelector('input')) {
                pictureDimSpan.style.background = 'rgba(255,255,255,0.2)';
            }
        });
        pictureDimSpan.addEventListener('mouseleave', () => {
            if (!pictureDimSpan.querySelector('input')) {
                pictureDimSpan.style.background = 'transparent';
            }
        });
        
        // Click handler to make inline editable
        pictureDimSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!pictureDimSpan.querySelector('input') && window.makeInlineEditable) {
                window.makeInlineEditable(card, pictureDimSpan);
            }
        });
        
        const frameDimSpan = document.createElement('span');
        frameDimSpan.className = 'frame-dimensions';
        frameDimSpan.style.cssText = `
            display: block;
            opacity: 0.7;
            font-size: 0.9em;
        `;
        
        dim.appendChild(pictureDimSpan);
        dim.appendChild(frameDimSpan);
        card.appendChild(dim);

        // Restore z-index
        if (photoData.zIndex) {
            card.style.zIndex = photoData.zIndex;
        }

        // CRITICAL: Apply the transform using the saved positions
        card.style.transform = `translate(${photoData.x}px, ${photoData.y}px) rotate(${photoData.rotation}deg)`;

        // Create resize and rotate handles
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.textContent = '⇲';
        frame.appendChild(resizeHandle);

        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.textContent = '↻';
        frame.appendChild(rotateHandle);

        // Attach event handlers manually WITHOUT calling makeCardInteractive
        // (which would reset the position)
        attachCardHandlers(card);

        return card;
    }

    // Attach drag/resize/rotate handlers without resetting position
    function attachCardHandlers(card) {
        // Selection handler
        card.addEventListener('click', (e) => {
            if (window.handleCardSelection) {
                window.handleCardSelection(card, e);
            }
        });

        // Drag handler
        card.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            if (e.target.classList.contains('rotate-handle')) return;
            if (e.target.classList.contains('photo-caption')) return;
            if (e.target.classList.contains('picture-dimensions')) return;
            if (e.target.classList.contains('dim-input')) return;
            
            if (window.startCardDrag) {
                window.startCardDrag(card, e);
            }
        });

        const frame = card.querySelector('.photo-frame');
        const resizeHandle = frame.querySelector('.resize-handle');
        const rotateHandle = frame.querySelector('.rotate-handle');

        // Resize handler
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', function(e) {
                if (window.startCardResize) {
                    window.startCardResize(card, e);
                }
                e.stopPropagation();
                e.preventDefault();
            });
        }

        // Rotate handler
        if (rotateHandle) {
            rotateHandle.addEventListener('mousedown', function(e) {
                if (window.startCardRotate) {
                    window.startCardRotate(card, e);
                }
                e.stopPropagation();
                e.preventDefault();
            });
        }
    }

    function updateUndoRedoButtons() {
        const undoBtn = document.querySelector('.toolbar-icon[title="Undo"]');
        const redoBtn = document.querySelector('.toolbar-icon[title="Redo"]');

        if (state.historyIndex <= 0) {
            undoBtn.classList.add('disabled');
        } else {
            undoBtn.classList.remove('disabled');
        }

        if (state.historyIndex >= state.history.length - 1) {
            redoBtn.classList.add('disabled');
        } else {
            redoBtn.classList.remove('disabled');
        }
    }

    // ===== DOWNLOAD/UPLOAD FUNCTIONALITY =====
    function handleDownload() {
        const data = {
            version: '1.0',
            documentTitle: document.querySelector('.doc-title').textContent,
            photos: state.history[state.historyIndex]?.photos || [],
            wall: state.history[state.historyIndex]?.wall || {},
            settings: {
                frameColor: document.getElementById('frameColor').value,
                frameThickness: document.getElementById('frameThickness').value,
                matteThickness: document.getElementById('matteThickness').value,
                measurementUnit: document.getElementById('measurementUnit').value
            },
            timestamp: Date.now()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        
        let filename = document.querySelector('.doc-title').textContent;
        filename = filename.replace(/[<>:"/\\|?*]/g, '');
        filename = filename.replace(/\s+/g, '_');
        
        if (!filename.toLowerCase().endsWith('.sequence')) {
            filename += '.sequence';
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sequence,application/json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const sequenceData = JSON.parse(event.target.result);
                    loadSequenceFile(sequenceData);
                } catch (error) {
                    alert('Error loading sequence file: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }

    function loadSequenceFile(data) {
        if (data.documentTitle) {
            document.querySelector('.doc-title').textContent = data.documentTitle;
        }

        const container = document.getElementById('photo-container');
        container.innerHTML = '';

        data.photos.forEach(photoData => {
            const photo = createPhotoCard(photoData);
            container.appendChild(photo);
        });

        if (data.wall) {
            document.getElementById('wallWidth').value = data.wall.width;
            document.getElementById('wallHeight').value = data.wall.height;
            document.getElementById('wallUnit').value = data.wall.unit;
            document.getElementById('wallColor').value = data.wall.color;
            
            const wall = document.getElementById('wall');
            if (data.wall.visible) {
                // Trigger the build wall button logic
                document.getElementById('buildWallBtn').click();
            }
        }

        if (data.settings) {
            document.getElementById('frameColor').value = data.settings.frameColor;
            document.getElementById('frameThickness').value = data.settings.frameThickness;
            document.getElementById('matteThickness').value = data.settings.matteThickness;
            document.getElementById('measurementUnit').value = data.settings.measurementUnit;
        }

        saveState();
    }

    // ===== RESET FUNCTIONALITY =====
    function handleReset() {
        if (!confirm('Are you sure you want to reset the layout? This will remove all photos and cannot be undone.')) {
            return;
        }

        const container = document.getElementById('photo-container');
        container.innerHTML = '';

        const wall = document.getElementById('wall');
        wall.style.display = 'none';
        document.getElementById('buildWallBtn').style.display = 'flex';
        document.getElementById('eraseWallBtn').style.display = 'none';

        document.getElementById('wallWidth').value = '144';
        document.getElementById('wallHeight').value = '96';
        document.getElementById('wallUnit').value = 'in';
        document.getElementById('wallColor').value = '#f1f1f1';
        document.getElementById('frameColor').value = '#fae7b5';
        document.getElementById('frameThickness').value = '1';
        document.getElementById('matteThickness').value = '1';
        document.getElementById('measurementUnit').value = 'in';
        document.querySelector('.doc-title').textContent = 'Untitled document';

        state.history = [];
        state.historyIndex = -1;
        saveState();
    }

    // ===== PRINT FUNCTIONALITY =====
    function handlePrint() {
        window.print();
    }

    // ===== KEYBOARD SHORTCUTS =====
    function handleKeyboardShortcuts(e) {
        // These are backup shortcuts - keyboard-shortcuts.js handles them too
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
        }
        
        if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
            e.preventDefault();
            handleRedo();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            handleSearch();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleDownload();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            handleUpload();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            handlePrint();
        }
    }

    // ===== EXPOSE FUNCTIONS FOR OTHER MODULES =====
    window.sequenceTable = window.sequenceTable || {};
    window.sequenceTable.saveState = saveState;
    window.sequenceTable.getState = () => state;

    // ===== AUTO-SAVE STATE ON MUTATIONS =====
    function observeChanges() {
        const container = document.getElementById('photo-container');
        const wall = document.getElementById('wall');
        
        let saveTimeout;
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (!state.isRestoring) {
                    saveState();
                }
            }, 300); // 300ms debounce for smoother dragging
        };

        // Observe photo container
        const observer = new MutationObserver((mutations) => {
            if (!state.isRestoring) {
                debouncedSave();
            }
        });
        
        observer.observe(container, {
            childList: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'data-x', 'data-y', 'data-rotation'],
            subtree: true
        });

        // Observe wall changes
        const wallObserver = new MutationObserver((mutations) => {
            if (!state.isRestoring) {
                debouncedSave();
            }
        });
        
        wallObserver.observe(wall, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // Listen to input changes
        const inputs = document.querySelectorAll('#wallWidth, #wallHeight, #wallUnit, #wallColor, #frameColor, #frameThickness, #matteThickness, #measurementUnit');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (!state.isRestoring) {
                    debouncedSave();
                }
            });
        });

        // Listen to document title changes
        const titleElement = document.querySelector('.doc-title');
        if (titleElement) {
            const titleObserver = new MutationObserver((mutations) => {
                if (!state.isRestoring) {
                    debouncedSave();
                }
            });
            
            titleObserver.observe(titleElement, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
    }

    // ===== INITIALIZE ON DOM READY =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            observeChanges();
        });
    } else {
        init();
        observeChanges();
    }

})();
