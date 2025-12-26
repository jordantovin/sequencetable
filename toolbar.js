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
        saveState(); // Save initial state
        updateUndoRedoButtons();
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

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    // ===== EDITABLE TITLE FUNCTIONALITY =====
    function setupEditableTitle() {
        const titleElement = document.querySelector('.doc-title');
        
        // Make title editable on click
        titleElement.addEventListener('click', function() {
            enableTitleEditing(this);
        });
        
        // Style improvements
        titleElement.style.cursor = 'text';
        titleElement.style.padding = '4px 8px';
        titleElement.style.borderRadius = '3px';
        titleElement.style.transition = 'background-color 0.2s';
        
        // Hover effect
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
        // If already editing, do nothing
        if (element.isContentEditable) return;
        
        // Store original text
        const originalText = element.textContent;
        
        // Make editable
        element.contentEditable = true;
        element.style.backgroundColor = 'white';
        element.style.outline = '2px solid #4285f4';
        element.style.outlineOffset = '2px';
        element.style.whiteSpace = 'nowrap'; // Force single line
        element.style.overflow = 'hidden'; // Hide overflow
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Focus
        element.focus();
        
        // Function to finish editing
        const finishEditing = () => {
            element.contentEditable = false;
            element.style.backgroundColor = 'transparent';
            element.style.outline = 'none';
            
            // Trim and validate
            let newText = element.textContent.trim();
            
            // Remove any line breaks
            newText = newText.replace(/[\r\n]+/g, ' ');
            
            // If empty, restore original
            if (!newText) {
                element.textContent = originalText;
                return;
            }
            
            // Remove any invalid filename characters
            newText = newText.replace(/[<>:"/\\|?*]/g, '');
            
            // Limit length
            if (newText.length > 100) {
                newText = newText.substring(0, 100);
            }
            
            element.textContent = newText;
            
            // Save state if changed
            if (newText !== originalText) {
                // The mutation observer will automatically save this change
            }
        };
        
        // Prevent line breaks and finish on Enter
        const keydownHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent line break
                element.blur(); // This will trigger finishEditing via blur event
            } else if (e.key === 'Escape') {
                e.preventDefault();
                element.textContent = originalText;
                element.blur();
            }
        };
        
        // Add keydown listener (not once, because we need it for every key press)
        element.addEventListener('keydown', keydownHandler);
        
        // Finish on blur
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
            
            if (filename.toLowerCase().includes(query.toLowerCase())) {
                // Highlight and scroll to found photo
                photo.style.boxShadow = '0 0 0 4px #4285f4';
                photo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                found = true;
                
                // Remove highlight after 2 seconds
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
        const container = document.getElementById('photo-container');
        const photos = Array.from(container.querySelectorAll('.photo-card')).map(photo => {
            const img = photo.querySelector('img');
            
            return {
                id: photo.dataset.id || 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                src: img?.src || '',
                
                // Get photographer name from caption
                photographer: photo.querySelector('.photo-caption')?.textContent || '',
                
                // Transform-based positioning (how photocards.js actually works)
                x: photo.dataset.x || '0',
                y: photo.dataset.y || '0',
                rotation: photo.dataset.rotation || '0',
                
                // Actual image dimensions
                imgWidth: img?.style.width || '',
                imgHeight: img?.style.height || '',
                
                // Frame data
                hasFrame: photo.classList.contains('has-frame'),
                frameThickness: photo.dataset.frameThickness || '0',
                frameColor: photo.dataset.frameColor || '#fae7b5',
                matteThickness: photo.dataset.matteThickness || '0',
                
                // Z-index for layering
                zIndex: photo.style.zIndex || '1000'
            };
        });

        const wallState = {
            visible: document.getElementById('wall').classList.contains('visible'),
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

        // Only clear future history if we're not at the end (i.e., user made a NEW change after undoing)
        // This preserves redo history when just navigating
        // But clears it when user makes a real change after undo
        if (state.historyIndex < state.history.length - 1) {
            // User made a new change after undoing - clear redo history
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        
        // Add new state
        state.history.push(newState);
        
        // Limit history size
        if (state.history.length > state.maxHistorySize) {
            state.history.shift();
        } else {
            state.historyIndex++;
        }

        updateUndoRedoButtons();
    }

    function handleUndo() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            restoreState(state.history[state.historyIndex]);
            updateUndoRedoButtons();
        }
    }

    function handleRedo() {
        if (state.historyIndex < state.history.length - 1) {
            state.historyIndex++;
            restoreState(state.history[state.historyIndex]);
            updateUndoRedoButtons();
        }
    }

    function restoreState(savedState) {
        // Set a flag to prevent the mutation observer from saving state during restoration
        state.isRestoring = true;
        
        const container = document.getElementById('photo-container');
        
        // Clear current photos
        container.innerHTML = '';
        
        // Restore photos
        if (savedState.photos && savedState.photos.length > 0) {
            savedState.photos.forEach(photoData => {
                const photo = createPhotoCard(photoData);
                container.appendChild(photo);
            });
        }

        // Restore document title
        if (savedState.documentTitle) {
            document.querySelector('.doc-title').textContent = savedState.documentTitle;
        }

        // Restore wall state
        const wall = document.getElementById('wall');
        const wallWidth = savedState.wall.width || '144';
        const wallHeight = savedState.wall.height || '96';
        const wallUnit = savedState.wall.unit || 'in';
        const wallColor = savedState.wall.color || '#f1f1f1';
        
        document.getElementById('wallWidth').value = wallWidth;
        document.getElementById('wallHeight').value = wallHeight;
        document.getElementById('wallUnit').value = wallUnit;
        document.getElementById('wallColor').value = wallColor;
        
        // Calculate wall dimensions in pixels
        let widthInPixels, heightInPixels;
        switch(wallUnit) {
            case 'in':
                widthInPixels = parseFloat(wallWidth) * 96;
                heightInPixels = parseFloat(wallHeight) * 96;
                break;
            case 'ft':
                widthInPixels = parseFloat(wallWidth) * 12 * 96;
                heightInPixels = parseFloat(wallHeight) * 12 * 96;
                break;
            case 'cm':
                widthInPixels = parseFloat(wallWidth) * 37.795;
                heightInPixels = parseFloat(wallHeight) * 37.795;
                break;
            case 'm':
                widthInPixels = parseFloat(wallWidth) * 3779.5;
                heightInPixels = parseFloat(wallHeight) * 3779.5;
                break;
            default:
                widthInPixels = parseFloat(wallWidth) * 96;
                heightInPixels = parseFloat(wallHeight) * 96;
        }
        
        // Apply wall styling
        wall.style.width = widthInPixels + 'px';
        wall.style.height = heightInPixels + 'px';
        wall.style.backgroundColor = wallColor;
        
        if (savedState.wall.visible) {
            wall.classList.add('visible');
            document.getElementById('buildWallBtn').style.display = 'none';
            document.getElementById('eraseWallBtn').style.display = 'flex';
        } else {
            wall.classList.remove('visible');
            document.getElementById('buildWallBtn').style.display = 'flex';
            document.getElementById('eraseWallBtn').style.display = 'none';
        }

        // Clear the restoring flag after a brief delay to let mutations settle
        setTimeout(() => {
            // Update dimensions text for all restored cards if dimensions are currently visible
            const dimensionsVisible = document.querySelector('.photo-dimensions')?.style.display !== 'none';
            if (dimensionsVisible && window.updateCardDimensionsText) {
                document.querySelectorAll('.photo-card').forEach(card => {
                    window.updateCardDimensionsText(card);
                });
            }
            
            state.isRestoring = false;
        }, 100);
    }

    function createPhotoCard(data) {
        // Create photo card matching photocards.js structure
        const card = document.createElement('div');
        card.className = 'photo-card';
        if (data.hasFrame) card.classList.add('has-frame');
        
        // Set dataset values
        card.dataset.id = data.id || 'photo-' + Date.now();
        card.dataset.x = data.x || '0';
        card.dataset.y = data.y || '0';
        card.dataset.rotation = data.rotation || '0';
        card.dataset.frameThickness = data.frameThickness || '0';
        card.dataset.frameColor = data.frameColor || '#fae7b5';
        card.dataset.matteThickness = data.matteThickness || '0';
        
        // Set z-index
        card.style.zIndex = data.zIndex || '1000';
        
        // Apply transform (this is how photocards.js positions cards)
        card.style.transform = `translate(${data.x}px, ${data.y}px) rotate(${data.rotation}deg)`;
        
        // Create photo-frame wrapper
        const frame = document.createElement('div');
        frame.className = 'photo-frame';
        
        // Create and configure image
        const img = document.createElement('img');
        img.src = data.src || '';
        img.alt = data.photographer || '';
        
        // Restore image dimensions
        if (data.imgWidth && data.imgHeight) {
            img.style.width = data.imgWidth;
            img.style.height = data.imgHeight;
        }
        
        frame.appendChild(img);
        card.appendChild(frame);
        
        // Create caption
        const caption = document.createElement('div');
        caption.className = 'photo-caption';
        caption.textContent = data.photographer || 'Unknown';
        caption.style.display = 'none'; // Will be toggled by Names button
        card.appendChild(caption);
        
        // Create dimensions display
        const dim = document.createElement('div');
        dim.className = 'photo-dimensions';
        dim.style.display = 'none';
        
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
            e.stopPropagation(); // Prevent card selection
            if (!pictureDimSpan.querySelector('input')) {
                if (window.makeInlineEditable) {
                    window.makeInlineEditable(card, pictureDimSpan);
                }
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
        
        // Apply frame styling if present
        if (data.hasFrame) {
            applyFrameToCard(card, frame, data);
        }
        
        // Re-attach all interactivity from photocards.js
        makeRestoredCardInteractive(card);
        
        return card;
    }
    
    function applyFrameToCard(card, frame, data) {
        const frameThickness = parseFloat(data.frameThickness) || 0;
        const matteThickness = parseFloat(data.matteThickness) || 0;
        const frameColor = data.frameColor || '#fae7b5';
        
        if (frameThickness > 0) {
            frame.style.setProperty('--frame-thickness', `${frameThickness}in`);
            frame.style.boxShadow = `0 0 0 ${frameThickness}in ${frameColor}`;
        }
        
        if (matteThickness > 0) {
            frame.style.padding = `${matteThickness}in`;
            frame.style.backgroundColor = 'white';
        }
    }
    
    function makeRestoredCardInteractive(card) {
        // This re-creates the interactivity from photocards.js
        // The actual photocards.js will handle most of this, but we need basic setup
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        // Click handler for selection (if keyboard-shortcuts.js is loaded)
        card.addEventListener('click', (e) => {
            if (window.sequenceTable && window.sequenceTable.keyboard) {
                // Let keyboard-shortcuts.js handle selection
            }
        });
        
        // Mousedown for dragging
        card.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            if (e.target.classList.contains('rotate-handle')) return;
            if (e.target.classList.contains('photo-caption')) return;
            if (e.target.classList.contains('picture-dimensions')) return;
            if (e.target.classList.contains('dim-input')) return;
            
            const x = parseFloat(card.dataset.x) || 0;
            const y = parseFloat(card.dataset.y) || 0;
            
            // Bring to front
            const maxZ = Array.from(document.querySelectorAll('.photo-card'))
                .reduce((max, c) => Math.max(max, parseInt(c.style.zIndex) || 1000), 1000);
            card.style.zIndex = maxZ + 1;
        });
    }

    function updateUndoRedoButtons() {
        const undoBtn = document.querySelector('.toolbar-icon[title="Undo"]');
        const redoBtn = document.querySelector('.toolbar-icon[title="Redo"]');
        
        if (state.historyIndex > 0) {
            undoBtn.classList.remove('disabled');
        } else {
            undoBtn.classList.add('disabled');
        }
        
        if (state.historyIndex < state.history.length - 1) {
            redoBtn.classList.remove('disabled');
        } else {
            redoBtn.classList.add('disabled');
        }
    }

    // ===== UPLOAD/DOWNLOAD FUNCTIONALITY =====
    function handleDownload() {
        const container = document.getElementById('photo-container');
        const photos = Array.from(container.querySelectorAll('.photo-card')).map(photo => {
            const img = photo.querySelector('img');
            
            return {
                id: photo.dataset.id,
                src: img?.src || '',
                photographer: photo.querySelector('.photo-caption')?.textContent || '',
                
                // Transform-based positioning
                x: photo.dataset.x || '0',
                y: photo.dataset.y || '0',
                rotation: photo.dataset.rotation || '0',
                
                // Image dimensions
                imgWidth: img?.style.width || '',
                imgHeight: img?.style.height || '',
                
                // Frame data
                hasFrame: photo.classList.contains('has-frame'),
                frameThickness: photo.dataset.frameThickness || '0',
                frameColor: photo.dataset.frameColor || '#fae7b5',
                matteThickness: photo.dataset.matteThickness || '0',
                
                // Z-index
                zIndex: photo.style.zIndex || '1000'
            };
        });

        const wallState = {
            visible: document.getElementById('wall').classList.contains('visible'),
            width: document.getElementById('wallWidth').value,
            height: document.getElementById('wallHeight').value,
            unit: document.getElementById('wallUnit').value,
            color: document.getElementById('wallColor').value
        };

        const documentTitle = document.querySelector('.doc-title').textContent.trim();

        const sequenceData = {
            version: '1.0',
            created: new Date().toISOString(),
            documentTitle: documentTitle,
            photos: photos,
            wall: wallState,
            settings: {
                frameColor: document.getElementById('frameColor').value,
                frameThickness: document.getElementById('frameThickness').value,
                matteThickness: document.getElementById('matteThickness').value,
                measurementUnit: document.getElementById('measurementUnit').value
            }
        };

        const blob = new Blob([JSON.stringify(sequenceData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Sanitize filename - remove invalid characters and add .sequence extension
        let filename = documentTitle || 'Untitled document';
        filename = filename.replace(/[<>:"/\\|?*]/g, ''); // Remove invalid filename chars
        filename = filename.replace(/\s+/g, '_'); // Replace spaces with underscores
        
        // Ensure it doesn't already end with .sequence
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
        // Update document title
        if (data.documentTitle) {
            document.querySelector('.doc-title').textContent = data.documentTitle;
        }

        // Clear current layout
        const container = document.getElementById('photo-container');
        container.innerHTML = '';

        // Load photos
        data.photos.forEach(photoData => {
            const photo = createPhotoCard(photoData);
            container.appendChild(photo);
        });

        // Load wall settings
        if (data.wall) {
            document.getElementById('wallWidth').value = data.wall.width;
            document.getElementById('wallHeight').value = data.wall.height;
            document.getElementById('wallUnit').value = data.wall.unit;
            document.getElementById('wallColor').value = data.wall.color;
            
            const wall = document.getElementById('wall');
            if (data.wall.visible) {
                wall.classList.add('visible');
                document.getElementById('buildWallBtn').style.display = 'none';
                document.getElementById('eraseWallBtn').style.display = 'flex';
            }
        }

        // Load settings
        if (data.settings) {
            document.getElementById('frameColor').value = data.settings.frameColor;
            document.getElementById('frameThickness').value = data.settings.frameThickness;
            document.getElementById('matteThickness').value = data.settings.matteThickness;
            document.getElementById('measurementUnit').value = data.settings.measurementUnit;
        }

        // Save this as a new state
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
        wall.classList.remove('visible');
        document.getElementById('buildWallBtn').style.display = 'flex';
        document.getElementById('eraseWallBtn').style.display = 'none';

        // Reset to defaults
        document.getElementById('wallWidth').value = '144';
        document.getElementById('wallHeight').value = '96';
        document.getElementById('wallUnit').value = 'in';
        document.getElementById('wallColor').value = '#f1f1f1';
        document.getElementById('frameColor').value = '#fae7b5';
        document.getElementById('frameThickness').value = '1';
        document.getElementById('matteThickness').value = '1';
        document.getElementById('measurementUnit').value = 'in';
        document.querySelector('.doc-title').textContent = 'Untitled document';

        // Clear history and save new state
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
        // Ctrl/Cmd + Z for Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            handleUndo();
        }
        
        // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y for Redo
        if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
            e.preventDefault();
            handleRedo();
        }
        
        // Ctrl/Cmd + F for Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            handleSearch();
        }
        
        // Ctrl/Cmd + S for Download
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleDownload();
        }
        
        // Ctrl/Cmd + O for Upload
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            handleUpload();
        }
        
        // Ctrl/Cmd + P for Print
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
        
        // Debounce function to avoid excessive saves
        let saveTimeout;
        const debouncedSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                // Don't save if we're restoring from undo/redo
                if (!state.isRestoring) {
                    saveState();
                }
            }, 100); // Save 100ms after last change - faster to capture granular changes
        };

        // Track if we should save based on mutation type
        const shouldSaveMutation = (mutations) => {
            for (const mutation of mutations) {
                // Ignore text content changes in filename divs (they don't affect state)
                if (mutation.type === 'characterData' && 
                    mutation.target.parentElement?.classList.contains('photo-filename')) {
                    continue;
                }
                
                // Save on any other mutation
                return true;
            }
            return false;
        };

        // Observe photo container for any changes
        const observer = new MutationObserver((mutations) => {
            if (!state.isRestoring && shouldSaveMutation(mutations)) {
                debouncedSave();
            }
        });
        
        observer.observe(container, {
            childList: true, // Photos added/removed
            attributes: true, // Position/style changes
            attributeFilter: ['style', 'class', 'data-frame-thickness', 'data-frame-color', 'data-matte-thickness'],
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

        // Listen to input changes in toolbar
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
