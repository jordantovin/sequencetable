// ============================================
// TOOLBAR.JS - PROPER UNDO/REDO SYSTEM
// Based on Sequence Table pattern
// ============================================

(function() {
    'use strict';

    // ===== UNDO/REDO STACKS =====
    const undoStack = [];
    const redoStack = [];

    // ===== TRACK DRAG STATE =====
    let originalPositions = new Map();
    let isDraggingForUndo = false;
    let originalImageSize = null;

    // ===== UNDO FUNCTION =====
    function undoLastAction() {
        if (undoStack.length === 0) {
            console.log('Nothing to undo');
            return;
        }

        const action = undoStack.pop();
        redoStack.push(action);

        console.log('Undoing action:', action.type);

        switch (action.type) {
            case 'move': {
                // Restore old position
                action.card.dataset.x = action.oldX;
                action.card.dataset.y = action.oldY;
                action.card.style.transform = `translate(${action.oldX}px, ${action.oldY}px) rotate(${action.card.dataset.rotation}deg)`;
                break;
            }

            case 'resize': {
                // Restore old size
                const img = action.card.querySelector('img');
                if (img) {
                    img.style.width = action.oldWidth;
                    img.style.height = action.oldHeight;
                }
                // Update dimensions if visible
                if (window.updateCardDimensionsText) {
                    window.updateCardDimensionsText(action.card);
                }
                break;
            }

            case 'rotate': {
                // Restore old rotation
                action.card.dataset.rotation = action.oldRotation;
                action.card.style.transform = `translate(${action.card.dataset.x}px, ${action.card.dataset.y}px) rotate(${action.oldRotation}deg)`;
                break;
            }

            case 'add': {
                // Remove cards that were added
                action.cards.forEach(card => {
                    if (card.parentNode) {
                        card.parentNode.removeChild(card);
                    }
                });
                break;
            }

            case 'remove': {
                // Re-add card that was removed
                const container = document.getElementById('photo-container');
                container.appendChild(action.card);
                break;
            }
        }

        updateUndoRedoButtons();
    }

    // ===== REDO FUNCTION =====
    function redoLastAction() {
        if (redoStack.length === 0) {
            console.log('Nothing to redo');
            return;
        }

        const action = redoStack.pop();
        undoStack.push(action);

        console.log('Redoing action:', action.type);

        switch (action.type) {
            case 'move': {
                // Apply new position
                action.card.dataset.x = action.newX;
                action.card.dataset.y = action.newY;
                action.card.style.transform = `translate(${action.newX}px, ${action.newY}px) rotate(${action.card.dataset.rotation}deg)`;
                break;
            }

            case 'resize': {
                // Apply new size
                const img = action.card.querySelector('img');
                if (img) {
                    img.style.width = action.newWidth;
                    img.style.height = action.newHeight;
                }
                // Update dimensions if visible
                if (window.updateCardDimensionsText) {
                    window.updateCardDimensionsText(action.card);
                }
                break;
            }

            case 'rotate': {
                // Apply new rotation
                action.card.dataset.rotation = action.newRotation;
                action.card.style.transform = `translate(${action.card.dataset.x}px, ${action.card.dataset.y}px) rotate(${action.newRotation}deg)`;
                break;
            }

            case 'add': {
                // Re-add cards
                const container = document.getElementById('photo-container');
                action.cards.forEach(card => {
                    container.appendChild(card);
                });
                break;
            }

            case 'remove': {
                // Remove card again
                if (action.card.parentNode) {
                    action.card.parentNode.removeChild(action.card);
                }
                break;
            }
        }

        updateUndoRedoButtons();
    }

    // ===== CAPTURE STATE BEFORE DRAG =====
    function capturePositionBeforeDrag(card) {
        if (!originalPositions.has(card)) {
            originalPositions.set(card, {
                x: parseFloat(card.dataset.x) || 0,
                y: parseFloat(card.dataset.y) || 0
            });
        }
        isDraggingForUndo = true;
    }

    // ===== SAVE MOVE TO UNDO STACK =====
    function saveMoveIfChanged(card) {
        if (!originalPositions.has(card)) return;

        const original = originalPositions.get(card);
        const currentX = parseFloat(card.dataset.x) || 0;
        const currentY = parseFloat(card.dataset.y) || 0;

        // Only save if position actually changed
        if (original.x !== currentX || original.y !== currentY) {
            undoStack.push({
                type: 'move',
                card: card,
                oldX: original.x,
                oldY: original.y,
                newX: currentX,
                newY: currentY
            });
            redoStack.length = 0; // Clear redo stack
            updateUndoRedoButtons();
            console.log('Saved move to undo stack');
        }

        originalPositions.delete(card);
        isDraggingForUndo = false;
    }

    // ===== CAPTURE STATE BEFORE RESIZE =====
    function captureImageSizeBeforeResize(card) {
        const img = card.querySelector('img');
        if (img) {
            originalImageSize = {
                card: card,
                width: img.style.width,
                height: img.style.height
            };
        }
    }

    // ===== SAVE RESIZE TO UNDO STACK =====
    function saveResizeIfChanged(card) {
        if (!originalImageSize || originalImageSize.card !== card) return;

        const img = card.querySelector('img');
        if (!img) return;

        const currentWidth = img.style.width;
        const currentHeight = img.style.height;

        // Only save if size actually changed
        if (originalImageSize.width !== currentWidth || originalImageSize.height !== currentHeight) {
            undoStack.push({
                type: 'resize',
                card: card,
                oldWidth: originalImageSize.width,
                oldHeight: originalImageSize.height,
                newWidth: currentWidth,
                newHeight: currentHeight
            });
            redoStack.length = 0; // Clear redo stack
            updateUndoRedoButtons();
            console.log('Saved resize to undo stack');
        }

        originalImageSize = null;
    }

    // ===== LISTEN FOR DRAG START =====
    document.addEventListener('mousedown', (e) => {
        const card = e.target.closest('.photo-card');
        if (!card) return;

        // Check if clicking on resize handle
        if (e.target.classList.contains('resize-handle')) {
            captureImageSizeBeforeResize(card);
            return;
        }

        // Check if clicking on rotate handle
        if (e.target.classList.contains('rotate-handle')) {
            // Rotation undo handled separately in photocards.js
            return;
        }

        // Otherwise, it's a drag
        capturePositionBeforeDrag(card);
    });

    // ===== LISTEN FOR DRAG END =====
    document.addEventListener('mouseup', () => {
        // Check all cards that might have been dragged
        document.querySelectorAll('.photo-card').forEach(card => {
            if (originalPositions.has(card)) {
                saveMoveIfChanged(card);
            }
            if (originalImageSize && originalImageSize.card === card) {
                saveResizeIfChanged(card);
            }
        });
    });

    // ===== TRACK WHEN PHOTOS ARE ADDED =====
    const container = document.getElementById('photo-container');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                // Cards added
                if (mutation.addedNodes.length > 0) {
                    const addedCards = Array.from(mutation.addedNodes).filter(node => 
                        node.classList && node.classList.contains('photo-card')
                    );
                    
                    if (addedCards.length > 0) {
                        undoStack.push({
                            type: 'add',
                            cards: addedCards
                        });
                        redoStack.length = 0;
                        updateUndoRedoButtons();
                        console.log('Saved add to undo stack');
                    }
                }

                // Cards removed
                if (mutation.removedNodes.length > 0) {
                    mutation.removedNodes.forEach(node => {
                        if (node.classList && node.classList.contains('photo-card')) {
                            undoStack.push({
                                type: 'remove',
                                card: node
                            });
                            redoStack.length = 0;
                            updateUndoRedoButtons();
                            console.log('Saved remove to undo stack');
                        }
                    });
                }
            }
        });
    });

    observer.observe(container, {
        childList: true
    });

    // ===== UPDATE UNDO/REDO BUTTON STATES =====
    function updateUndoRedoButtons() {
        const undoBtn = document.querySelector('.toolbar-icon[title="Undo"]');
        const redoBtn = document.querySelector('.toolbar-icon[title="Redo"]');

        if (undoBtn) {
            if (undoStack.length === 0) {
                undoBtn.classList.add('disabled');
            } else {
                undoBtn.classList.remove('disabled');
            }
        }

        if (redoBtn) {
            if (redoStack.length === 0) {
                redoBtn.classList.add('disabled');
            } else {
                redoBtn.classList.remove('disabled');
            }
        }
    }

    // ===== KEYBOARD SHORTCUTS =====
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + Z = Undo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoLastAction();
            return;
        }

        // Cmd/Ctrl + Shift + Z = Redo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            redoLastAction();
            return;
        }

        // Cmd/Ctrl + Y = Redo (alternative)
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            redoLastAction();
            return;
        }
    });

    // ===== BUTTON CLICK HANDLERS =====
    function init() {
        const undoBtn = document.querySelector('.toolbar-icon[title="Undo"]');
        const redoBtn = document.querySelector('.toolbar-icon[title="Redo"]');

        if (undoBtn) {
            undoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                undoLastAction();
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                redoLastAction();
            });
        }

        updateUndoRedoButtons();
    }

    // ===== INITIALIZE =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ===== EXPOSE FOR OTHER MODULES =====
    window.sequenceTable = {
        undo: undoLastAction,
        redo: redoLastAction,
        getUndoStack: () => undoStack,
        getRedoStack: () => redoStack
    };

})();
