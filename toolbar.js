// toolbar.js - Handles all toolbar button functionality

(function() {
    'use strict';

    // ===== STATE MANAGEMENT =====
    const state = {
        history: [],
        historyIndex: -1,
        maxHistorySize: 50
    };

    // ===== INITIALIZATION =====
    function init() {
        setupEventListeners();
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
            return {
                id: photo.dataset.id,
                src: photo.querySelector('img')?.src || '',
                filename: photo.querySelector('.photo-filename')?.textContent || '',
                left: photo.style.left,
                top: photo.style.top,
                width: photo.dataset.width,
                height: photo.dataset.height,
                hasFrame: photo.classList.contains('has-frame'),
                frameThickness: photo.dataset.frameThickness,
                frameColor: photo.dataset.frameColor,
                matteThickness: photo.dataset.matteThickness
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
            timestamp: Date.now()
        };

        // Remove any states after current index (for redo)
        state.history = state.history.slice(0, state.historyIndex + 1);
        
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
        const container = document.getElementById('photo-container');
        
        // Clear current photos
        container.innerHTML = '';
        
        // Restore photos
        savedState.photos.forEach(photoData => {
            // This assumes you have a function to create photo cards
            // You'll need to adapt this to match your photocards.js implementation
            const photo = createPhotoCard(photoData);
            container.appendChild(photo);
        });

        // Restore wall state
        const wall = document.getElementById('wall');
        document.getElementById('wallWidth').value = savedState.wall.width;
        document.getElementById('wallHeight').value = savedState.wall.height;
        document.getElementById('wallUnit').value = savedState.wall.unit;
        document.getElementById('wallColor').value = savedState.wall.color;
        
        if (savedState.wall.visible) {
            wall.classList.add('visible');
            document.getElementById('buildWallBtn').style.display = 'none';
            document.getElementById('eraseWallBtn').style.display = 'flex';
        } else {
            wall.classList.remove('visible');
            document.getElementById('buildWallBtn').style.display = 'flex';
            document.getElementById('eraseWallBtn').style.display = 'none';
        }
    }

    function createPhotoCard(data) {
        // Create photo card from saved data
        const card = document.createElement('div');
        card.className = 'photo-card';
        if (data.hasFrame) card.classList.add('has-frame');
        
        card.dataset.id = data.id;
        card.dataset.width = data.width;
        card.dataset.height = data.height;
        card.dataset.frameThickness = data.frameThickness || '0';
        card.dataset.frameColor = data.frameColor || '#fae7b5';
        card.dataset.matteThickness = data.matteThickness || '0';
        
        card.style.left = data.left;
        card.style.top = data.top;
        
        const img = document.createElement('img');
        img.src = data.src;
        img.alt = data.filename;
        
        const filename = document.createElement('div');
        filename.className = 'photo-filename';
        filename.textContent = data.filename;
        
        card.appendChild(img);
        card.appendChild(filename);
        
        return card;
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
            return {
                id: photo.dataset.id,
                src: photo.querySelector('img')?.src || '',
                filename: photo.querySelector('.photo-filename')?.textContent || '',
                left: photo.style.left,
                top: photo.style.top,
                width: photo.dataset.width,
                height: photo.dataset.height,
                hasFrame: photo.classList.contains('has-frame'),
                frameThickness: photo.dataset.frameThickness,
                frameColor: photo.dataset.frameColor,
                matteThickness: photo.dataset.matteThickness
            };
        });

        const wallState = {
            visible: document.getElementById('wall').classList.contains('visible'),
            width: document.getElementById('wallWidth').value,
            height: document.getElementById('wallHeight').value,
            unit: document.getElementById('wallUnit').value,
            color: document.getElementById('wallColor').value
        };

        const sequenceData = {
            version: '1.0',
            created: new Date().toISOString(),
            documentTitle: document.querySelector('.doc-title').textContent,
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
        a.download = `${sequenceData.documentTitle || 'layout'}.sequence`;
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
                saveState();
            }, 300); // Save 300ms after last change
        };

        // Observe photo container for any changes
        const observer = new MutationObserver(debouncedSave);
        observer.observe(container, {
            childList: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'data-frame-thickness', 'data-frame-color', 'data-matte-thickness'],
            subtree: true
        });

        // Observe wall changes
        const wallObserver = new MutationObserver(debouncedSave);
        wallObserver.observe(wall, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // Listen to input changes in toolbar
        const inputs = document.querySelectorAll('#wallWidth, #wallHeight, #wallUnit, #wallColor, #frameColor, #frameThickness, #matteThickness, #measurementUnit');
        inputs.forEach(input => {
            input.addEventListener('change', debouncedSave);
        });

        // Listen to document title changes
        const titleElement = document.querySelector('.doc-title');
        if (titleElement) {
            const titleObserver = new MutationObserver(debouncedSave);
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
