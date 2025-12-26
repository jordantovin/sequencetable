// ============================================
// SEARCH COMMAND PALETTE (Google Docs Style)
// ============================================

(function() {
    'use strict';

    // ===== SVG ICON LIBRARY =====
    function getIcon(type) {
        const icons = {
            search: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`,
            undo: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>`,
            redo: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>`,
            upload: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>`,
            download: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`,
            reset: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
            print: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>`,
            photo: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
            grid: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z"/></svg>`,
            lock: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>`,
            magnet: `<span class="material-symbols-outlined" style="font-size: 18px; color: #5f6368;">border_clear</span>`,
            person: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
            dimensions: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h18v8zM6 15h2v-2H6v2zm3.5 0h2v-2h-2v2zm7 0h2v-2h-2v2z"/></svg>`,
            frame: `<svg viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="8" y="8" width="8" height="8" stroke-width="1.5"/></svg>`,
            wall: `<span class="material-symbols-outlined" style="font-size: 18px; color: #5f6368;">format_image_front</span>`,
            trash: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
            duplicate: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`,
            select: `<svg viewBox="0 0 24 24" fill="#5f6368"><path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z"/></svg>`,
            add1: `<span style="font-size: 12px; font-weight: 500; color: #5f6368;">+1</span>`,
            add5: `<span style="font-size: 12px; font-weight: 500; color: #5f6368;">+5</span>`,
        };
        return icons[type] || '';
    }

    // ===== COMMAND REGISTRY =====
    const commands = [
        // File operations
        { name: 'Download layout', icon: 'download', action: () => document.querySelector('.toolbar-icon[title="Download layout"]')?.click(), category: 'File' },
        { name: 'Upload layout', icon: 'upload', action: () => document.querySelector('.toolbar-icon[title="Upload layout"]')?.click(), category: 'File' },
        { name: 'Print', icon: 'print', action: () => document.querySelector('.toolbar-icon[title="Print"]')?.click(), category: 'File' },
        { name: 'Reset', icon: 'reset', action: () => document.querySelector('.toolbar-icon[title="Reset"]')?.click(), category: 'File' },
        
        // Edit operations
        { name: 'Undo', icon: 'undo', action: () => document.querySelector('.toolbar-icon[title="Undo"]')?.click(), shortcut: 'Cmd+Z', category: 'Edit' },
        { name: 'Redo', icon: 'redo', action: () => document.querySelector('.toolbar-icon[title="Redo"]')?.click(), shortcut: 'Cmd+Shift+Z', category: 'Edit' },
        
        // Photo operations
        { name: 'Upload photo', icon: 'photo', action: () => document.getElementById('uploadPhotoBtn')?.click(), category: 'Photos' },
        { name: 'Add 1 photo', icon: 'add1', action: () => document.getElementById('add1PhotoBtn')?.click(), shortcut: 'Cmd+1', category: 'Photos' },
        { name: 'Add 5 photos', icon: 'add5', action: () => document.getElementById('add5PhotosBtn')?.click(), shortcut: 'Cmd+5', category: 'Photos' },
        
        // View toggles
        { name: 'Toggle grid', icon: 'grid', action: () => document.querySelector('.toolbar-icon[title="Grid"]')?.click(), shortcut: 'G', category: 'View' },
        { name: 'Lock grid', icon: 'lock', action: () => document.querySelector('.toolbar-icon[title="Lock grid"]')?.click(), category: 'View' },
        { name: 'Toggle magnetic snapping', icon: 'magnet', action: () => document.getElementById('magnetToggleBtn')?.click(), shortcut: 'M', category: 'View' },
        { name: 'Toggle names', icon: 'person', action: () => document.querySelector('.toolbar-icon[title="Names"]')?.click(), shortcut: 'N', category: 'View' },
        { name: 'Toggle dimensions', icon: 'dimensions', action: () => document.getElementById('dimensionsToggleBtn')?.click(), shortcut: 'D', category: 'View' },
        
        // Frame operations
        { name: 'Apply frame', icon: 'frame', action: () => document.getElementById('applyFrameBtn')?.click(), shortcut: 'F', category: 'Frame' },
        { name: 'Remove frame from selected', icon: 'frame', action: removeFrameFromSelected, shortcut: 'Shift+F', category: 'Frame' },
        
        // Wall operations
        { name: 'Build wall', icon: 'wall', action: () => document.getElementById('buildWallBtn')?.click(), shortcut: 'W', category: 'Wall' },
        { name: 'Erase wall', icon: 'trash', action: () => document.getElementById('eraseWallBtn')?.click(), category: 'Wall' },
        
        // Selection
        { name: 'Select all photos', icon: 'select', action: selectAllPhotos, shortcut: 'Cmd+A', category: 'Selection' },
        { name: 'Deselect all', icon: 'select', action: deselectAll, shortcut: 'Esc', category: 'Selection' },
        { name: 'Duplicate selected', icon: 'duplicate', action: duplicateSelected, shortcut: 'Cmd+D', category: 'Selection' },
        { name: 'Delete selected', icon: 'trash', action: deleteSelected, shortcut: 'Delete', category: 'Selection' },
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
                icon.innerHTML = getIcon(cmd.icon);
                icon.style.cssText = `
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                // SVGs are already styled with fill="#5f6368"
                const svg = icon.querySelector('svg');
                if (svg) {
                    svg.style.width = '18px';
                    svg.style.height = '18px';
                }
                
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
