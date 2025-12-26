// ============================================
// SEARCH COMMAND PALETTE (Google Docs Style)
// ============================================

(function() {
    'use strict';

    // ===== COMMAND REGISTRY =====
    const commands = [
        // File operations
        { name: 'Download layout', icon: '↓', action: () => document.querySelector('.toolbar-icon[title="Download layout"]')?.click(), category: 'File' },
        { name: 'Upload layout', icon: '↑', action: () => document.querySelector('.toolbar-icon[title="Upload layout"]')?.click(), category: 'File' },
        { name: 'Print', icon: '🖨', action: () => document.querySelector('.toolbar-icon[title="Print"]')?.click(), category: 'File' },
        { name: 'Reset', icon: '↻', action: () => document.querySelector('.toolbar-icon[title="Reset"]')?.click(), category: 'File' },
        
        // Edit operations
        { name: 'Undo', icon: '↶', action: () => document.querySelector('.toolbar-icon[title="Undo"]')?.click(), shortcut: 'Cmd+Z', category: 'Edit' },
        { name: 'Redo', icon: '↷', action: () => document.querySelector('.toolbar-icon[title="Redo"]')?.click(), shortcut: 'Cmd+Shift+Z', category: 'Edit' },
        
        // Photo operations
        { name: 'Upload photo', icon: '📷', action: () => document.getElementById('uploadPhotoBtn')?.click(), category: 'Photos' },
        { name: 'Add 1 photo', icon: '+1', action: () => document.getElementById('add1PhotoBtn')?.click(), shortcut: 'Cmd+1', category: 'Photos' },
        { name: 'Add 5 photos', icon: '+5', action: () => document.getElementById('add5PhotosBtn')?.click(), shortcut: 'Cmd+5', category: 'Photos' },
        
        // View toggles
        { name: 'Toggle grid', icon: '⊞', action: () => document.querySelector('.toolbar-icon[title="Grid"]')?.click(), shortcut: 'G', category: 'View' },
        { name: 'Lock grid', icon: '🔒', action: () => document.querySelector('.toolbar-icon[title="Lock grid"]')?.click(), category: 'View' },
        { name: 'Toggle magnetic snapping', icon: '🧲', action: () => document.getElementById('magnetToggleBtn')?.click(), shortcut: 'M', category: 'View' },
        { name: 'Toggle names', icon: '👤', action: () => document.querySelector('.toolbar-icon[title="Names"]')?.click(), shortcut: 'N', category: 'View' },
        { name: 'Toggle dimensions', icon: '📏', action: () => document.getElementById('dimensionsToggleBtn')?.click(), shortcut: 'D', category: 'View' },
        
        // Frame operations
        { name: 'Apply frame', icon: '🖼', action: () => document.getElementById('applyFrameBtn')?.click(), shortcut: 'F', category: 'Frame' },
        { name: 'Remove frame from selected', icon: '✖', action: removeFrameFromSelected, shortcut: 'Shift+F', category: 'Frame' },
        
        // Wall operations
        { name: 'Build wall', icon: '🏗', action: () => document.getElementById('buildWallBtn')?.click(), shortcut: 'W', category: 'Wall' },
        { name: 'Erase wall', icon: '🗑', action: () => document.getElementById('eraseWallBtn')?.click(), category: 'Wall' },
        
        // Selection
        { name: 'Select all photos', icon: '☑', action: selectAllPhotos, shortcut: 'Cmd+A', category: 'Selection' },
        { name: 'Deselect all', icon: '☐', action: deselectAll, shortcut: 'Esc', category: 'Selection' },
        { name: 'Duplicate selected', icon: '⎘', action: duplicateSelected, shortcut: 'Cmd+D', category: 'Selection' },
        { name: 'Delete selected', icon: '🗑', action: deleteSelected, shortcut: 'Delete', category: 'Selection' },
    ];

    // ===== CREATE SEARCH MODAL =====
    function createSearchModal() {
        const modal = document.createElement('div');
        modal.id = 'searchModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: transparent;
            display: none;
            z-index: 999999;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.id = 'searchModalContent';
        modalContent.style.cssText = `
            position: absolute;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            width: 400px;
            max-height: 500px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Search input
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Menus (Option+/)';
        searchInput.id = 'searchInput';
        searchInput.style.cssText = `
            border: none;
            outline: none;
            padding: 12px 16px;
            font-size: 14px;
            border-bottom: 1px solid #e0e0e0;
            font-family: 'Google Sans', Arial, sans-serif;
        `;
        
        // Results container
        const resultsContainer = document.createElement('div');
        resultsContainer.id = 'searchResults';
        resultsContainer.style.cssText = `
            overflow-y: auto;
            max-height: 400px;
        `;
        
        modalContent.appendChild(searchInput);
        modalContent.appendChild(resultsContainer);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        return { modal, searchInput, resultsContainer, modalContent };
    }

    // ===== RENDER RESULTS =====
    function renderResults(results, resultsContainer, selectedIndex = 0) {
        resultsContainer.innerHTML = '';
        
        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #666; font-size: 13px;">
                    No results found
                </div>
            `;
            return;
        }
        
        // Group by category
        const grouped = {};
        results.forEach(cmd => {
            if (!grouped[cmd.category]) grouped[cmd.category] = [];
            grouped[cmd.category].push(cmd);
        });
        
        let currentIndex = 0;
        Object.keys(grouped).forEach(category => {
            // Category header
            const categoryHeader = document.createElement('div');
            categoryHeader.style.cssText = `
                padding: 6px 16px;
                font-size: 11px;
                font-weight: 600;
                color: #666;
                background: #f8f9fa;
                border-top: 1px solid #e0e0e0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            `;
            categoryHeader.textContent = category;
            resultsContainer.appendChild(categoryHeader);
            
            // Commands in category
            grouped[category].forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.dataset.index = currentIndex;
                item.style.cssText = `
                    padding: 8px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    transition: background 0.1s;
                    font-size: 14px;
                    ${currentIndex === selectedIndex ? 'background: #e8f0fe;' : ''}
                `;
                
                item.onmouseover = () => {
                    item.style.background = '#e8f0fe';
                };
                item.onmouseout = () => {
                    if (parseInt(item.dataset.index) !== selectedIndex) {
                        item.style.background = 'transparent';
                    }
                };
                
                item.onclick = () => {
                    executeCommand(cmd);
                    closeSearchModal();
                };
                
                const leftContent = document.createElement('div');
                leftContent.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `;
                
                const icon = document.createElement('span');
                icon.textContent = cmd.icon;
                icon.style.cssText = `
                    font-size: 16px;
                    width: 20px;
                    text-align: center;
                `;
                
                const name = document.createElement('span');
                name.textContent = cmd.name;
                name.style.cssText = `
                    font-size: 13px;
                    color: #202124;
                `;
                
                leftContent.appendChild(icon);
                leftContent.appendChild(name);
                
                const rightContent = document.createElement('div');
                if (cmd.shortcut) {
                    const shortcut = document.createElement('span');
                    shortcut.textContent = cmd.shortcut;
                    shortcut.style.cssText = `
                        font-size: 11px;
                        color: #666;
                        background: #f1f3f4;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-family: monospace;
                    `;
                    rightContent.appendChild(shortcut);
                }
                
                item.appendChild(leftContent);
                item.appendChild(rightContent);
                resultsContainer.appendChild(item);
                
                currentIndex++;
            });
        });
    }

    // ===== SEARCH FUNCTION =====
    function searchCommands(query) {
        if (!query) return commands;
        
        const lowerQuery = query.toLowerCase();
        return commands.filter(cmd => 
            cmd.name.toLowerCase().includes(lowerQuery) ||
            cmd.category.toLowerCase().includes(lowerQuery) ||
            (cmd.shortcut && cmd.shortcut.toLowerCase().includes(lowerQuery))
        );
    }

    // ===== EXECUTE COMMAND =====
    function executeCommand(cmd) {
        try {
            cmd.action();
        } catch (error) {
            console.error('Error executing command:', error);
        }
    }

    // ===== HELPER FUNCTIONS =====
    function selectAllPhotos() {
        document.querySelectorAll('.photo-card').forEach(card => {
            card.classList.add('selected');
        });
    }

    function deselectAll() {
        document.querySelectorAll('.photo-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    }

    function duplicateSelected() {
        const selectedCards = window.getSelectedCards?.() || [];
        if (selectedCards.length === 0) return;
        
        const container = document.getElementById('photo-container');
        selectedCards.forEach(card => {
            const clone = card.cloneNode(true);
            const x = parseFloat(card.dataset.x) || 0;
            const y = parseFloat(card.dataset.y) || 0;
            clone.dataset.x = x + 30;
            clone.dataset.y = y + 30;
            clone.style.transform = `translate(${x + 30}px, ${y + 30}px) rotate(${card.dataset.rotation || 0}deg)`;
            container.appendChild(clone);
        });
    }

    function deleteSelected() {
        const selectedCards = window.getSelectedCards?.() || [];
        selectedCards.forEach(card => card.remove());
    }

    function removeFrameFromSelected() {
        const selectedCards = window.getSelectedCards?.() || [];
        selectedCards.forEach(card => {
            const frame = card.querySelector('.photo-frame');
            if (frame) {
                frame.style.boxShadow = 'none';
                frame.style.padding = '0';
                frame.style.background = 'transparent';
                frame.style.setProperty('--frame-thickness', '0px');
            }
        });
    }

    // ===== MODAL CONTROLS =====
    let selectedIndex = 0;
    let currentResults = commands;

    function openSearchModal() {
        const modal = document.getElementById('searchModal');
        const modalContent = document.getElementById('searchModalContent');
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('searchResults');
        
        // Position modal content below search icon
        const searchIcon = document.querySelector('.toolbar-icon[title="Search"]');
        if (searchIcon) {
            const rect = searchIcon.getBoundingClientRect();
            modalContent.style.top = `${rect.bottom + 4}px`;
            modalContent.style.left = `${rect.left}px`;
        }
        
        modal.style.display = 'block';
        searchInput.value = '';
        searchInput.focus();
        
        selectedIndex = 0;
        currentResults = commands;
        renderResults(currentResults, resultsContainer, selectedIndex);
    }

    function closeSearchModal() {
        const modal = document.getElementById('searchModal');
        modal.style.display = 'none';
    }

    // ===== EVENT HANDLERS =====
    function setupEventHandlers() {
        const { modal, searchInput, resultsContainer, modalContent } = createSearchModal();
        
        // Click on search icon
        const searchIcon = document.querySelector('.toolbar-icon[title="Search"]');
        if (searchIcon) {
            searchIcon.addEventListener('click', openSearchModal);
        }
        
        // Click outside modal content to close
        modal.addEventListener('click', (e) => {
            if (!modalContent.contains(e.target)) {
                closeSearchModal();
            }
        });
        
        // Search input
        searchInput.addEventListener('input', (e) => {
            e.stopPropagation(); // Prevent interference with keyboard-shortcuts.js
            currentResults = searchCommands(e.target.value);
            selectedIndex = 0;
            renderResults(currentResults, resultsContainer, selectedIndex);
        });
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            // CRITICAL: Stop all keyboard events from propagating to keyboard-shortcuts.js
            e.stopPropagation();
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
                renderResults(currentResults, resultsContainer, selectedIndex);
                
                // Scroll into view
                const selectedItem = resultsContainer.querySelector(`[data-index="${selectedIndex}"]`);
                selectedItem?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                renderResults(currentResults, resultsContainer, selectedIndex);
                
                // Scroll into view
                const selectedItem = resultsContainer.querySelector(`[data-index="${selectedIndex}"]`);
                selectedItem?.scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentResults[selectedIndex]) {
                    executeCommand(currentResults[selectedIndex]);
                    closeSearchModal();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSearchModal();
            }
            // All other keys (including Backspace, Delete, letters, numbers) 
            // are now allowed to work normally in the input
        });
        
        // Also stop propagation on keyup to prevent any interference
        searchInput.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });
        
        // And keypress for older browsers
        searchInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
        });
        
        // Global keyboard shortcut: Cmd+/ or Option+/
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.altKey) && e.key === '/') {
                e.preventDefault();
                openSearchModal();
            }
        });
    }

    // ===== INITIALIZATION =====
    window.addEventListener('load', setupEventHandlers);

})();
