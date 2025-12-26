// keyboard-shortcuts.js - Comprehensive keyboard shortcuts for Sequence Table

(function() {
    'use strict';

    // ===== SHORTCUT CONFIGURATION =====
    const shortcuts = {
        // File operations
        'ctrl+s': { action: 'download', preventDefault: true, description: 'Save layout' },
        'cmd+s': { action: 'download', preventDefault: true, description: 'Save layout' },
        'ctrl+o': { action: 'upload', preventDefault: true, description: 'Open layout' },
        'cmd+o': { action: 'upload', preventDefault: true, description: 'Open layout' },
        'ctrl+p': { action: 'print', preventDefault: true, description: 'Print layout' },
        'cmd+p': { action: 'print', preventDefault: true, description: 'Print layout' },
        
        // Edit operations
        'ctrl+z': { action: 'undo', preventDefault: true, description: 'Undo' },
        'cmd+z': { action: 'undo', preventDefault: true, description: 'Undo' },
        'ctrl+shift+z': { action: 'redo', preventDefault: true, description: 'Redo' },
        'cmd+shift+z': { action: 'redo', preventDefault: true, description: 'Redo' },
        'ctrl+y': { action: 'redo', preventDefault: true, description: 'Redo' },
        'cmd+y': { action: 'redo', preventDefault: true, description: 'Redo' },
        'ctrl+d': { action: 'duplicate', preventDefault: true, description: 'Duplicate selected photo' },
        'cmd+d': { action: 'duplicate', preventDefault: true, description: 'Duplicate selected photo' },
        'ctrl+a': { action: 'selectAll', preventDefault: true, description: 'Select all photos' },
        'cmd+a': { action: 'selectAll', preventDefault: true, description: 'Select all photos' },
        
        // Search and navigation
        'ctrl+f': { action: 'search', preventDefault: true, description: 'Search photos' },
        'cmd+f': { action: 'search', preventDefault: true, description: 'Search photos' },
        'escape': { action: 'escape', preventDefault: false, description: 'Close dialogs/deselect' },
        
        // Photo operations
        'delete': { action: 'deleteSelected', preventDefault: true, description: 'Delete selected photos' },
        'backspace': { action: 'deleteSelected', preventDefault: true, description: 'Delete selected photos' },
        
        // Quick add photos
        'ctrl+1': { action: 'add1Photo', preventDefault: true, description: 'Add 1 photo' },
        'cmd+1': { action: 'add1Photo', preventDefault: true, description: 'Add 1 photo' },
        'ctrl+5': { action: 'add5Photos', preventDefault: true, description: 'Add 5 photos' },
        'cmd+5': { action: 'add5Photos', preventDefault: true, description: 'Add 5 photos' },
        
        // View toggles
        'g': { action: 'toggleGrid', preventDefault: false, description: 'Toggle grid' },
        'd': { action: 'toggleDimensions', preventDefault: false, description: 'Toggle dimensions' },
        'n': { action: 'toggleNames', preventDefault: false, description: 'Toggle names' },
        'm': { action: 'toggleMagnet', preventDefault: false, description: 'Toggle magnetic snapping' },
        
        // Frame operations
        'f': { action: 'applyFrame', preventDefault: false, description: 'Apply frame to selected' },
        'shift+f': { action: 'removeFrame', preventDefault: false, description: 'Remove frame from selected' },
        
        // Wall operations
        'w': { action: 'toggleWall', preventDefault: false, description: 'Toggle wall' },
        
        // Arrow keys for movement
        'arrowup': { action: 'moveUp', preventDefault: true, description: 'Move photo up' },
        'arrowdown': { action: 'moveDown', preventDefault: true, description: 'Move photo down' },
        'arrowleft': { action: 'moveLeft', preventDefault: true, description: 'Move photo left' },
        'arrowright': { action: 'moveRight', preventDefault: true, description: 'Move photo right' },
        
        // Arrow keys with shift for fine movement
        'shift+arrowup': { action: 'moveUpFine', preventDefault: true, description: 'Move photo up (fine)' },
        'shift+arrowdown': { action: 'moveDownFine', preventDefault: true, description: 'Move photo down (fine)' },
        'shift+arrowleft': { action: 'moveLeftFine', preventDefault: true, description: 'Move photo left (fine)' },
        'shift+arrowright': { action: 'moveRightFine', preventDefault: true, description: 'Move photo right (fine)' },
        
        // Help
        'shift+/': { action: 'showHelp', preventDefault: true, description: 'Show keyboard shortcuts' },
        '?': { action: 'showHelp', preventDefault: true, description: 'Show keyboard shortcuts' }
    };

    // ===== STATE =====
    const state = {
        selectedPhotos: new Set(),
        lastSelected: null,
        isTyping: false
    };

    // ===== INITIALIZATION =====
    function init() {
        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('click', handleClick);
        
        // Track when user is typing in inputs
        document.addEventListener('focusin', (e) => {
            if (e.target.matches('input, textarea, [contenteditable="true"]')) {
                state.isTyping = true;
            }
        });
        
        document.addEventListener('focusout', (e) => {
            if (e.target.matches('input, textarea, [contenteditable="true"]')) {
                state.isTyping = false;
            }
        });
    }

    // ===== KEYBOARD EVENT HANDLER =====
    function handleKeydown(e) {
        // Build shortcut key string
        const parts = [];
        if (e.ctrlKey) parts.push('ctrl');
        if (e.metaKey) parts.push('cmd');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        parts.push(e.key.toLowerCase());
        
        const shortcutKey = parts.join('+');
        const shortcut = shortcuts[shortcutKey];
        
        if (!shortcut) return;
        
        // Prevent default if specified
        if (shortcut.preventDefault) {
            e.preventDefault();
        }
        
        // Don't trigger single-key shortcuts while typing (except escape)
        if (state.isTyping && !shortcutKey.includes('ctrl') && !shortcutKey.includes('cmd') && shortcutKey !== 'escape') {
            return;
        }
        
        // Execute action
        executeAction(shortcut.action, e);
    }

    // ===== ACTION HANDLERS =====
    function executeAction(action, event) {
        const actions = {
            // File operations
            download: () => document.querySelector('.toolbar-icon[title="Download layout"]').click(),
            upload: () => document.querySelector('.toolbar-icon[title="Upload layout"]').click(),
            print: () => document.querySelector('.toolbar-icon[title="Print"]').click(),
            
            // Edit operations
            undo: () => document.querySelector('.toolbar-icon[title="Undo"]').click(),
            redo: () => document.querySelector('.toolbar-icon[title="Redo"]').click(),
            duplicate: () => duplicateSelected(),
            selectAll: () => selectAllPhotos(),
            
            // Search
            search: () => document.querySelector('.toolbar-icon[title="Search"]').click(),
            
            // Escape
            escape: () => handleEscape(),
            
            // Delete
            deleteSelected: () => deleteSelectedPhotos(),
            
            // Add photos
            add1Photo: () => document.getElementById('add1PhotoBtn').click(),
            add5Photos: () => document.getElementById('add5PhotosBtn').click(),
            
            // View toggles
            toggleGrid: () => document.querySelector('.toolbar-icon[title="Grid"]').click(),
            toggleDimensions: () => document.getElementById('dimensionsToggleBtn').click(),
            toggleNames: () => document.querySelector('.toolbar-icon[title="Names"]').click(),
            toggleMagnet: () => document.getElementById('magnetToggleBtn').click(),
            
            // Frame operations
            applyFrame: () => applyFrameToSelected(),
            removeFrame: () => removeFrameFromSelected(),
            
            // Wall
            toggleWall: () => {
                const buildBtn = document.getElementById('buildWallBtn');
                const eraseBtn = document.getElementById('eraseWallBtn');
                if (buildBtn.style.display !== 'none') {
                    buildBtn.click();
                } else {
                    eraseBtn.click();
                }
            },
            
            // Movement
            moveUp: () => moveSelected(0, -10),
            moveDown: () => moveSelected(0, 10),
            moveLeft: () => moveSelected(-10, 0),
            moveRight: () => moveSelected(10, 0),
            moveUpFine: () => moveSelected(0, -1),
            moveDownFine: () => moveSelected(0, 1),
            moveLeftFine: () => moveSelected(-1, 0),
            moveRightFine: () => moveSelected(1, 0),
            
            // Help
            showHelp: () => showKeyboardShortcuts()
        };
        
        if (actions[action]) {
            actions[action]();
        }
    }

    // ===== SELECTION MANAGEMENT =====
    function handleClick(e) {
        const photoCard = e.target.closest('.photo-card');
        
        if (!photoCard) {
            // Clicked outside - deselect all
            if (!e.target.closest('.toolbar') && !e.target.closest('.context-menu')) {
                deselectAll();
            }
            return;
        }
        
        if (e.ctrlKey || e.metaKey) {
            // Toggle selection
            toggleSelection(photoCard);
        } else if (e.shiftKey && state.lastSelected) {
            // Range selection
            selectRange(state.lastSelected, photoCard);
        } else {
            // Single selection
            deselectAll();
            selectPhoto(photoCard);
        }
    }

    function selectPhoto(photo) {
        photo.classList.add('selected');
        state.selectedPhotos.add(photo);
        state.lastSelected = photo;
    }

    function deselectPhoto(photo) {
        photo.classList.remove('selected');
        state.selectedPhotos.delete(photo);
    }

    function toggleSelection(photo) {
        if (state.selectedPhotos.has(photo)) {
            deselectPhoto(photo);
        } else {
            selectPhoto(photo);
        }
    }

    function deselectAll() {
        state.selectedPhotos.forEach(photo => {
            photo.classList.remove('selected');
        });
        state.selectedPhotos.clear();
        state.lastSelected = null;
    }

    function selectAllPhotos() {
        const photos = document.querySelectorAll('.photo-card');
        photos.forEach(photo => selectPhoto(photo));
    }

    function selectRange(start, end) {
        const photos = Array.from(document.querySelectorAll('.photo-card'));
        const startIndex = photos.indexOf(start);
        const endIndex = photos.indexOf(end);
        
        const min = Math.min(startIndex, endIndex);
        const max = Math.max(startIndex, endIndex);
        
        deselectAll();
        for (let i = min; i <= max; i++) {
            selectPhoto(photos[i]);
        }
    }

    // ===== PHOTO OPERATIONS =====
    function duplicateSelected() {
        if (state.selectedPhotos.size === 0) return;
        
        state.selectedPhotos.forEach(photo => {
            const clone = photo.cloneNode(true);
            
            // Offset position
            const left = parseInt(photo.style.left) + 20;
            const top = parseInt(photo.style.top) + 20;
            clone.style.left = left + 'px';
            clone.style.top = top + 'px';
            
            // Generate new ID
            clone.dataset.id = 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            
            document.getElementById('photo-container').appendChild(clone);
        });
        
        // Save state will be triggered by MutationObserver
    }

    function deleteSelectedPhotos() {
        if (state.selectedPhotos.size === 0) return;
        
        state.selectedPhotos.forEach(photo => {
            photo.remove();
        });
        
        state.selectedPhotos.clear();
        state.lastSelected = null;
        
        // Save state will be triggered by MutationObserver
    }

    function applyFrameToSelected() {
        if (state.selectedPhotos.size === 0) return;
        
        const frameThickness = document.getElementById('frameThickness').value;
        const frameColor = document.getElementById('frameColor').value;
        const matteThickness = document.getElementById('matteThickness').value;
        
        state.selectedPhotos.forEach(photo => {
            photo.classList.add('has-frame');
            photo.dataset.frameThickness = frameThickness;
            photo.dataset.frameColor = frameColor;
            photo.dataset.matteThickness = matteThickness;
            
            // Trigger frame update (assumes this function exists in photocards.js)
            if (window.updatePhotoFrame) {
                window.updatePhotoFrame(photo);
            }
        });
    }

    function removeFrameFromSelected() {
        if (state.selectedPhotos.size === 0) return;
        
        state.selectedPhotos.forEach(photo => {
            photo.classList.remove('has-frame');
            photo.dataset.frameThickness = '0';
            photo.dataset.matteThickness = '0';
            
            // Trigger frame update
            if (window.updatePhotoFrame) {
                window.updatePhotoFrame(photo);
            }
        });
    }

    function moveSelected(dx, dy) {
        if (state.selectedPhotos.size === 0) return;
        
        state.selectedPhotos.forEach(photo => {
            const currentLeft = parseInt(photo.style.left) || 0;
            const currentTop = parseInt(photo.style.top) || 0;
            
            photo.style.left = (currentLeft + dx) + 'px';
            photo.style.top = (currentTop + dy) + 'px';
        });
        
        // Save state will be triggered by MutationObserver
    }

    function handleEscape() {
        // Close any open modals or dialogs
        const contextMenu = document.getElementById('photoContextMenu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        
        // Deselect all photos
        deselectAll();
    }

    // ===== HELP DIALOG =====
    function showKeyboardShortcuts() {
        const categories = {
            'File Operations': [
                'ctrl+s / cmd+s',
                'ctrl+o / cmd+o',
                'ctrl+p / cmd+p'
            ],
            'Edit Operations': [
                'ctrl+z / cmd+z',
                'ctrl+shift+z / cmd+shift+z',
                'ctrl+y / cmd+y',
                'ctrl+d / cmd+d',
                'ctrl+a / cmd+a',
                'delete / backspace'
            ],
            'Navigation': [
                'ctrl+f / cmd+f',
                'escape'
            ],
            'Quick Add': [
                'ctrl+1 / cmd+1',
                'ctrl+5 / cmd+5'
            ],
            'View Toggles': [
                'g',
                'd',
                'n',
                'm',
                'w'
            ],
            'Frame Operations': [
                'f',
                'shift+f'
            ],
            'Photo Movement': [
                'arrow keys',
                'shift+arrow keys'
            ],
            'Help': [
                '? or shift+/'
            ]
        };

        let helpHTML = '<div style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:30px; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index:10000; max-height:80vh; overflow-y:auto; min-width:500px;">';
        helpHTML += '<h2 style="margin-top:0; font-size:20px; margin-bottom:20px;">Keyboard Shortcuts</h2>';
        
        for (const [category, shortcutKeys] of Object.entries(categories)) {
            helpHTML += `<h3 style="font-size:14px; margin-top:20px; margin-bottom:10px; color:#666;">${category}</h3>`;
            helpHTML += '<table style="width:100%; border-collapse:collapse;">';
            
            shortcutKeys.forEach(key => {
                const shortcut = shortcuts[key] || shortcuts[key.split(' / ')[0]];
                if (shortcut) {
                    const keyDisplay = key.split(' / ').map(k => 
                        `<kbd style="background:#f5f5f5; padding:3px 8px; border-radius:3px; border:1px solid #ddd; font-family:monospace; font-size:12px;">${k}</kbd>`
                    ).join(' or ');
                    
                    helpHTML += `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px 0;">${keyDisplay}</td>
                        <td style="padding:8px 0; text-align:right; color:#666; font-size:13px;">${shortcut.description}</td>
                    </tr>`;
                }
            });
            
            helpHTML += '</table>';
        }
        
        helpHTML += '<button onclick="this.parentElement.remove()" style="margin-top:20px; padding:8px 16px; background:#4285f4; color:white; border:none; border-radius:4px; cursor:pointer; font-size:14px;">Close</button>';
        helpHTML += '</div>';
        
        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;';
        backdrop.innerHTML = helpHTML;
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                backdrop.remove();
            }
        });
        
        document.body.appendChild(backdrop);
    }

    // ===== EXPOSE FUNCTIONS =====
    window.sequenceTable = window.sequenceTable || {};
    window.sequenceTable.keyboard = {
        getSelectedPhotos: () => Array.from(state.selectedPhotos),
        selectPhoto,
        deselectPhoto,
        deselectAll,
        showHelp: showKeyboardShortcuts
    };

    // ===== INITIALIZE =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
