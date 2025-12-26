// ============================================
// PHOTOCARDS.JS - REWRITTEN TO MATCH SEQUENCE TABLE PATTERN
// ============================================

(function() {
    'use strict';

    // ===== STATE VARIABLES =====
    let csvData = [];
    let currentPhotoIndex = 0;
    let areNamesVisible = false;
    let isMagneticSnappingEnabled = false;
    let zIndexCounter = 10000;

    // ===== UNDO/REDO STACKS =====
    const undoStack = [];
    const redoStack = [];

    // ===== SELECTION =====
    const selectedCards = new Set();

    /* ============ UNDO/REDO FUNCTIONS ============ */
    
    function undoLastAction() {
        if (undoStack.length === 0) return;
        
        const action = undoStack.pop();
        redoStack.push(action);

        switch (action.type) {
            case 'remove': {
                // Re-add card
                const container = document.getElementById('photo-container');
                container.appendChild(action.card);
                updateZIndex(action.card);
                break;
            }
            case 'add': {
                // Remove cards that were added
                action.cards.forEach(c => {
                    if (c.parentNode) c.parentNode.removeChild(c);
                });
                break;
            }
            case 'move': {
                // Restore old position
                action.card.dataset.x = action.oldX;
                action.card.dataset.y = action.oldY;
                updateCardTransform(action.card);
                break;
            }
            case 'resize': {
                // Restore old size
                const img = action.card.querySelector('img');
                if (img) {
                    img.style.width = action.oldWidth;
                    img.style.height = action.oldHeight;
                }
                window.updateCardDimensionsText?.(action.card);
                break;
            }
        }

        updateUndoRedoButtons();
    }

    function redoLastAction() {
        if (redoStack.length === 0) return;
        
        const action = redoStack.pop();
        undoStack.push(action);

        switch (action.type) {
            case 'remove': {
                // Remove card again
                if (action.card.parentNode) {
                    action.card.parentNode.removeChild(action.card);
                }
                break;
            }
            case 'add': {
                // Re-add cards
                const container = document.getElementById('photo-container');
                action.cards.forEach(c => {
                    container.appendChild(c);
                    updateZIndex(c);
                });
                break;
            }
            case 'move': {
                // Apply new position
                action.card.dataset.x = action.newX;
                action.card.dataset.y = action.newY;
                updateCardTransform(action.card);
                break;
            }
            case 'resize': {
                // Apply new size
                const img = action.card.querySelector('img');
                if (img) {
                    img.style.width = action.newWidth;
                    img.style.height = action.newHeight;
                }
                window.updateCardDimensionsText?.(action.card);
                break;
            }
        }

        updateUndoRedoButtons();
    }

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

    /* ============ SELECTION FUNCTIONS ============ */
    
    function handleCardSelection(card, event) {
        if (event.target.closest('.resize-handle') || event.target.closest('.rotate-handle')) {
            return;
        }
        
        const isCurrentlySelected = card.classList.contains('selected');
        
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            if (!isCurrentlySelected || selectedCards.size > 1) {
                selectedCards.forEach(c => c.classList.remove('selected'));
                selectedCards.clear();
            }
        }
        
        if (isCurrentlySelected) {
            card.classList.remove('selected');
            selectedCards.delete(card);
        } else {
            card.classList.add('selected');
            selectedCards.add(card);
        }
    }

    window.getSelectedCards = () => Array.from(selectedCards);

    /* ============ Z-INDEX MANAGEMENT ============ */
    
    function updateZIndex(element) {
        zIndexCounter++;
        element.style.zIndex = zIndexCounter;
    }

    function getHighestZIndex() {
        let max = 10000;
        document.querySelectorAll('.photo-card').forEach(c => {
            const z = parseInt(c.style.zIndex) || 10000;
            if (z > max) max = z;
        });
        return max;
    }

    /* ============ TRANSFORM HELPER ============ */
    
    function updateCardTransform(card) {
        const x = parseFloat(card.dataset.x) || 0;
        const y = parseFloat(card.dataset.y) || 0;
        const rotation = parseFloat(card.dataset.rotation) || 0;
        card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }

    /* ============ PHOTOSHOP-STYLE SNAP GUIDES ============ */
    const SNAP_THRESHOLD = 15;
    
    function getVisualBounds(card) {
        const frame = card.querySelector('.photo-frame');
        if (!frame) return null;
        
        const frameRect = frame.getBoundingClientRect();
        
        let frameBorder = 0;
        const frameThicknessVar = frame.style.getPropertyValue('--frame-thickness');
        if (frameThicknessVar) {
            const match = frameThicknessVar.match(/^(\d+(?:\.\d+)?)(px|in|mm)$/);
            if (match) {
                frameBorder = parseFloat(match[1]);
                const unit = match[2];
                if (unit === 'in') frameBorder = frameBorder * 96;
                else if (unit === 'mm') frameBorder = frameBorder * 96 / 25.4;
            }
        }
        
        return {
            left: frameRect.left - frameBorder,
            top: frameRect.top - frameBorder,
            right: frameRect.right + frameBorder,
            bottom: frameRect.bottom + frameBorder,
            centerX: frameRect.left + frameRect.width / 2,
            centerY: frameRect.top + frameRect.height / 2
        };
    }
    
    function getWallBounds() {
        const wall = document.getElementById('wall');
        if (!wall || wall.style.display === 'none') return null;
        
        const rect = wall.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    }
    
    function getProposedBounds(activeCard, proposedX, proposedY) {
        const frame = activeCard.querySelector('.photo-frame');
        if (!frame) return null;
        
        const currentRect = frame.getBoundingClientRect();
        const currentCardX = parseFloat(activeCard.dataset.x) || 0;
        const currentCardY = parseFloat(activeCard.dataset.y) || 0;
        
        const frameOffsetX = currentRect.left - currentCardX;
        const frameOffsetY = currentRect.top - currentCardY;
        
        const frameLeft = proposedX + frameOffsetX;
        const frameTop = proposedY + frameOffsetY;
        
        let frameBorder = 0;
        const frameThicknessVar = frame.style.getPropertyValue('--frame-thickness');
        if (frameThicknessVar) {
            const match = frameThicknessVar.match(/^(\d+(?:\.\d+)?)(px|in|mm)$/);
            if (match) {
                frameBorder = parseFloat(match[1]);
                const unit = match[2];
                if (unit === 'in') frameBorder = frameBorder * 96;
                else if (unit === 'mm') frameBorder = frameBorder * 96 / 25.4;
            }
        }
        
        return {
            left: frameLeft - frameBorder,
            top: frameTop - frameBorder,
            right: frameLeft + currentRect.width + frameBorder,
            bottom: frameTop + currentRect.height + frameBorder,
            centerX: frameLeft + currentRect.width / 2,
            centerY: frameTop + currentRect.height / 2
        };
    }
    
    function clearGuides() {
        document.querySelectorAll('.snap-guide').forEach(g => g.remove());
        document.querySelectorAll('.snap-guide-label').forEach(l => l.remove());
        document.querySelectorAll('.gap-label').forEach(l => l.remove());
    }
    
    function showGuide(position, type) {
        const guide = document.createElement('div');
        guide.className = 'snap-guide';
        
        if (type === 'horizontal') {
            guide.style.position = 'fixed';
            guide.style.left = '0';
            guide.style.top = position + 'px';
            guide.style.width = '100vw';
            guide.style.height = '1px';
        } else {
            guide.style.position = 'fixed';
            guide.style.left = position + 'px';
            guide.style.top = '0';
            guide.style.width = '1px';
            guide.style.height = '100vh';
        }
        
        document.body.appendChild(guide);
    }
    
    function showGapLabel(gapPixels, position, type, bounds1, bounds2) {
        const wall = document.getElementById("wall");
        if (!wall) return;

        let displayText;
        if (window.currentWallInches) {
            const scaleX = window.currentWallInches.width / wall.offsetWidth;
            const scaleY = window.currentWallInches.height / wall.offsetHeight;
            const wallUnitEl = document.getElementById("wallUnit");
            const displayUnit = wallUnitEl ? wallUnitEl.value : "in";
            const gapIn = type === 'horizontal' ? gapPixels * scaleY : gapPixels * scaleX;
            const UNIT_FROM_IN = { in: 1, ft: 1/12, cm: 2.54, m: 0.0254 };
            const gapDisplay = gapIn * UNIT_FROM_IN[displayUnit];
            displayText = gapPixels === 0 ? `0${displayUnit}` : `${gapDisplay.toFixed(1)}${displayUnit}`;
        } else {
            displayText = gapPixels === 0 ? '0px' : `${Math.round(gapPixels)}px`;
        }

        const label = document.createElement('div');
        label.className = 'gap-label';
        label.textContent = displayText;
        label.style.cssText = `
            position: fixed;
            background: none;
            color: #ff6464;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: bold;
            z-index: 100000;
            pointer-events: none;
            white-space: nowrap;
            box-shadow: none;
        `;

        if (type === 'horizontal') {
            const centerX = (Math.max(bounds1.left, bounds2.left) + Math.min(bounds1.right, bounds2.right)) / 2;
            const gapCenterY = position;
            label.style.left = centerX + 'px';
            label.style.top = gapCenterY + 'px';
            label.style.transform = 'translate(-50%, -50%)';
        } else {
            const centerY = (Math.max(bounds1.top, bounds2.top) + Math.min(bounds1.bottom, bounds2.bottom)) / 2;
            const gapCenterX = position;
            label.style.left = gapCenterX + 'px';
            label.style.top = centerY + 'px';
            label.style.transform = 'translate(-50%, -50%)';
        }

        document.body.appendChild(label);
    }
    
    function showNearbyGaps(activeCard, proposed) {
        const GAP_DETECTION_RANGE = 200;
        
        document.querySelectorAll('.photo-card').forEach(otherCard => {
            if (otherCard === activeCard) return;
            
            const other = getVisualBounds(otherCard);
            if (!other) return;
            
            const verticalOverlap = !(proposed.bottom < other.top || proposed.top > other.bottom);
            if (verticalOverlap) {
                if (proposed.left > other.right && proposed.left - other.right < GAP_DETECTION_RANGE) {
                    const gap = proposed.left - other.right;
                    const gapCenterX = other.right + gap / 2;
                    showGapLabel(gap, gapCenterX, 'vertical', proposed, other);
                }
                else if (other.left > proposed.right && other.left - proposed.right < GAP_DETECTION_RANGE) {
                    const gap = other.left - proposed.right;
                    const gapCenterX = proposed.right + gap / 2;
                    showGapLabel(gap, gapCenterX, 'vertical', proposed, other);
                }
            }
            
            const horizontalOverlap = !(proposed.right < other.left || proposed.left > other.right);
            if (horizontalOverlap) {
                if (proposed.top > other.bottom && proposed.top - other.bottom < GAP_DETECTION_RANGE) {
                    const gap = proposed.top - other.bottom;
                    const gapCenterY = other.bottom + gap / 2;
                    showGapLabel(gap, gapCenterY, 'horizontal', proposed, other);
                }
                else if (other.top > proposed.bottom && other.top - proposed.bottom < GAP_DETECTION_RANGE) {
                    const gap = other.top - proposed.bottom;
                    const gapCenterY = proposed.bottom + gap / 2;
                    showGapLabel(gap, gapCenterY, 'horizontal', proposed, other);
                }
            }
        });
    }
    
    function findSnapPosition(activeCard, proposedX, proposedY) {
        clearGuides();
        
        const proposed = getProposedBounds(activeCard, proposedX, proposedY);
        if (!proposed) return { x: proposedX, y: proposedY };
        
        let snapX = proposedX;
        let snapY = proposedY;
        let snappedX = false;
        let snappedY = false;
        let guideX = null;
        let guideY = null;
        
        const wall = getWallBounds();
        if (wall) {
            if (!snappedX) {
                if (Math.abs(proposed.left - wall.left) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.left - wall.left);
                    snappedX = true;
                    guideX = wall.left;
                }
                else if (Math.abs(proposed.right - wall.right) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.right - wall.right);
                    snappedX = true;
                    guideX = wall.right;
                }
                else if (Math.abs(proposed.centerX - wall.centerX) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.centerX - wall.centerX);
                    snappedX = true;
                    guideX = wall.centerX;
                }
            }
            
            if (!snappedY) {
                if (Math.abs(proposed.top - wall.top) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.top - wall.top);
                    snappedY = true;
                    guideY = wall.top;
                }
                else if (Math.abs(proposed.bottom - wall.bottom) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.bottom - wall.bottom);
                    snappedY = true;
                    guideY = wall.bottom;
                }
                else if (Math.abs(proposed.centerY - wall.centerY) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.centerY - wall.centerY);
                    snappedY = true;
                    guideY = wall.centerY;
                }
            }
        }
        
        document.querySelectorAll('.photo-card').forEach(otherCard => {
            if (otherCard === activeCard) return;
            
            const other = getVisualBounds(otherCard);
            if (!other) return;
            
            if (!snappedX) {
                if (Math.abs(proposed.left - other.left) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.left - other.left);
                    snappedX = true;
                    guideX = other.left;
                }
                else if (Math.abs(proposed.right - other.right) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.right - other.right);
                    snappedX = true;
                    guideX = other.right;
                }
                else if (Math.abs(proposed.left - other.right) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.left - other.right);
                    snappedX = true;
                    guideX = other.right;
                }
                else if (Math.abs(proposed.right - other.left) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.right - other.left);
                    snappedX = true;
                    guideX = other.left;
                }
                else if (Math.abs(proposed.centerX - other.centerX) < SNAP_THRESHOLD) {
                    snapX = proposedX - (proposed.centerX - other.centerX);
                    snappedX = true;
                    guideX = other.centerX;
                }
            }
            
            if (!snappedY) {
                if (Math.abs(proposed.top - other.top) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.top - other.top);
                    snappedY = true;
                    guideY = other.top;
                }
                else if (Math.abs(proposed.bottom - other.bottom) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.bottom - other.bottom);
                    snappedY = true;
                    guideY = other.bottom;
                }
                else if (Math.abs(proposed.top - other.bottom) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.top - other.bottom);
                    snappedY = true;
                    guideY = other.bottom;
                }
                else if (Math.abs(proposed.bottom - other.top) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.bottom - other.top);
                    snappedY = true;
                    guideY = other.top;
                }
                else if (Math.abs(proposed.centerY - other.centerY) < SNAP_THRESHOLD) {
                    snapY = proposedY - (proposed.centerY - other.centerY);
                    snappedY = true;
                    guideY = other.centerY;
                }
            }
        });
        
        if (guideX !== null) showGuide(guideX, 'vertical');
        if (guideY !== null) showGuide(guideY, 'horizontal');
        
        const snappedProposed = getProposedBounds(activeCard, snapX, snapY);
        if (snappedProposed) {
            showNearbyGaps(activeCard, snappedProposed);
        }
        
        return { x: snapX, y: snapY };
    }

    /* ============ DIMENSION HELPER ============ */
    
    window.getCardDimensions = function(card) {
        const img = card.querySelector("img");
        const frame = card.querySelector(".photo-frame");
        
        if (!img || !frame) return null;
        
        const pictureWidth = img.offsetWidth;
        const pictureHeight = img.offsetHeight;
        const frameWidth = frame.offsetWidth;
        const frameHeight = frame.offsetHeight;
        
        return {
            picture: { width: pictureWidth, height: pictureHeight },
            frame: { width: frameWidth, height: frameHeight }
        };
    };

    /* ============ INLINE EDITABLE DIMENSIONS ============ */
    
    function makeInlineEditable(card, pictureDimSpan) {
        const wall = document.getElementById("wall");
        if (!window.currentWallInches || !wall) {
            alert("Please build a wall first to set dimensions.");
            return;
        }

        const img = card.querySelector("img");
        if (!img) return;

        if (pictureDimSpan.querySelector('input')) return;

        const scaleX = window.currentWallInches.width / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        const measurementUnitEl = document.getElementById("measurementUnit");
        const displayUnit = measurementUnitEl ? measurementUnitEl.value : "in";

        const picWIn = img.offsetWidth * scaleX;
        const picHIn = img.offsetHeight * scaleY;

        let currentW, currentH, unitLabel;
        if (displayUnit === "mm") {
            currentW = (picWIn * 25.4).toFixed(1);
            currentH = (picHIn * 25.4).toFixed(1);
            unitLabel = "mm";
        } else {
            currentW = picWIn.toFixed(2);
            currentH = picHIn.toFixed(2);
            unitLabel = '"';
        }

        const aspectRatio = img.offsetHeight / img.offsetWidth;

        pictureDimSpan.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 4px;">
                Photo
                <input type="number" class="dim-input dim-width" value="${currentW}" step="${displayUnit === 'mm' ? '1' : '0.1'}" min="0.1" 
                    style="width: 60px; padding: 2px 4px; border: 1px solid #666; border-radius: 3px; 
                    background: #333; color: #fff; font-size: 12px; text-align: center;">
                <span>${unitLabel} ×</span>
                <input type="number" class="dim-input dim-height" value="${currentH}" step="${displayUnit === 'mm' ? '1' : '0.1'}" min="0.1"
                    style="width: 60px; padding: 2px 4px; border: 1px solid #666; border-radius: 3px; 
                    background: #333; color: #fff; font-size: 12px; text-align: center;">
                <span>${unitLabel}</span>
            </span>
        `;

        const widthInput = pictureDimSpan.querySelector('.dim-width');
        const heightInput = pictureDimSpan.querySelector('.dim-height');

        widthInput.addEventListener('input', () => {
            const newWidth = parseFloat(widthInput.value) || 0;
            heightInput.value = displayUnit === 'mm' 
                ? (newWidth * aspectRatio).toFixed(1)
                : (newWidth * aspectRatio).toFixed(2);
        });

        heightInput.addEventListener('input', () => {
            const newHeight = parseFloat(heightInput.value) || 0;
            widthInput.value = displayUnit === 'mm'
                ? (newHeight / aspectRatio).toFixed(1)
                : (newHeight / aspectRatio).toFixed(2);
        });

        function applyChanges() {
            let newWidthIn, newHeightIn;
            const inputW = parseFloat(widthInput.value);
            const inputH = parseFloat(heightInput.value);

            if (isNaN(inputW) || isNaN(inputH) || inputW <= 0 || inputH <= 0) {
                window.updateCardDimensionsText?.(card);
                return;
            }

            if (displayUnit === "mm") {
                newWidthIn = inputW / 25.4;
                newHeightIn = inputH / 25.4;
            } else {
                newWidthIn = inputW;
                newHeightIn = inputH;
            }

            const pixelsPerInchX = wall.offsetWidth / window.currentWallInches.width;
            const pixelsPerInchY = wall.offsetHeight / window.currentWallInches.height;
            const pixelsPerInch = (pixelsPerInchX + pixelsPerInchY) / 2;

            const newWidthPx = newWidthIn * pixelsPerInch;
            const newHeightPx = newHeightIn * pixelsPerInch;

            img.style.width = newWidthPx + "px";
            img.style.height = newHeightPx + "px";

            window.updateCardDimensionsText?.(card);
        }

        function handleKeyDown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyChanges();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                window.updateCardDimensionsText?.(card);
            }
        }

        widthInput.addEventListener('keydown', handleKeyDown);
        heightInput.addEventListener('keydown', handleKeyDown);

        function handleBlur(e) {
            setTimeout(() => {
                const activeEl = document.activeElement;
                if (activeEl !== widthInput && activeEl !== heightInput) {
                    applyChanges();
                }
            }, 100);
        }

        widthInput.addEventListener('blur', handleBlur);
        heightInput.addEventListener('blur', handleBlur);

        widthInput.addEventListener('mousedown', e => e.stopPropagation());
        heightInput.addEventListener('mousedown', e => e.stopPropagation());

        widthInput.focus();
        widthInput.select();
    }

    window.makeInlineEditable = makeInlineEditable;

    /* ============ CSV LOADING ============ */
    
    async function loadCSVData() {
        try {
            const response = await fetch(
                'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv'
            );
            const csvText = await response.text();
            const rows = csvText.split('\n');
            csvData = rows.slice(1).filter(r => r.trim()).map(row => {
                const [link, photographer] = row.split(',');
                return {
                    link: link?.trim() || '',
                    photographer: photographer?.trim() || 'Unknown'
                };
            });
        } catch (err) {
            console.error('CSV Load Error:', err);
        }
    }

    /* ============ CREATE PHOTO CARD ============ */
    
    function createPhotoCard(imageUrl, photographer) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        // Random initial position
        card.dataset.rotation = "0";
        const randX = Math.random() * (window.innerWidth - 400) + 50;
        const randY = Math.random() * (window.innerHeight - 400) + 150;
        card.dataset.x = randX;
        card.dataset.y = randY;
        card.style.zIndex = zIndexCounter++;
        updateCardTransform(card);
        
        // Frame wrapper
        const frame = document.createElement('div');
        frame.className = 'photo-frame';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = photographer;
        img.onload = function() {
            const ratio = img.naturalHeight / img.naturalWidth;
            img.style.width = "300px";
            img.style.height = (300 * ratio) + "px";
            window.updateCardDimensionsText?.(card);
        };
        
        frame.appendChild(img);
        card.appendChild(frame);
        
        // Caption
        const caption = document.createElement('div');
        caption.className = 'photo-caption';
        caption.textContent = photographer || 'Unknown';
        caption.style.display = areNamesVisible ? '' : 'none';
        card.appendChild(caption);
        
        // Dimensions label
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
        
        pictureDimSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!pictureDimSpan.querySelector('input')) {
                makeInlineEditable(card, pictureDimSpan);
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
        
        // Make interactive
        makeCardInteractive(card);
        
        return card;
    }

    /* ============ MAKE CARD INTERACTIVE - SEQUENCE TABLE PATTERN ============ */
    
    function makeCardInteractive(card) {
        let isDragging = false;
        let isResizing = false;
        let originalPositions = new Map();
        let originalImageSize = null;

        // ===== CLICK HANDLER (Selection) =====
        card.addEventListener('click', (e) => handleCardSelection(card, e));

        // ===== DRAG HANDLER =====
        card.addEventListener('mousedown', function startDrag(e) {
            if (e.target.classList.contains('resize-handle')) return;
            if (e.target.classList.contains('rotate-handle')) return;
            if (e.target.classList.contains('photo-caption')) return;
            if (e.target.classList.contains('picture-dimensions')) return;
            if (e.target.classList.contains('dim-input')) return;

            isDragging = true;
            updateZIndex(card);

            // CAPTURE ORIGINAL POSITION FOR UNDO
            originalPositions.set(card, {
                left: parseFloat(card.dataset.x) || 0,
                top: parseFloat(card.dataset.y) || 0
            });

            const dragOffset = {
                x: e.clientX - parseFloat(card.dataset.x),
                y: e.clientY - parseFloat(card.dataset.y)
            };

            function drag(ev) {
                if (!isDragging) return;

                let newX = ev.clientX - dragOffset.x;
                let newY = ev.clientY - dragOffset.y;

                // Apply snapping if enabled
                if (!ev.altKey && isMagneticSnappingEnabled) {
                    const snapped = findSnapPosition(card, newX, newY);
                    newX = snapped.x;
                    newY = snapped.y;
                } else {
                    clearGuides();
                }

                card.dataset.x = newX;
                card.dataset.y = newY;
                updateCardTransform(card);
                window.updateCardDimensionsText?.(card);
            }

            function endDrag() {
                if (!isDragging) return;
                isDragging = false;

                // SAVE TO UNDO STACK IF POSITION CHANGED
                const original = originalPositions.get(card);
                const currentX = parseFloat(card.dataset.x) || 0;
                const currentY = parseFloat(card.dataset.y) || 0;

                if (original && (original.left !== currentX || original.top !== currentY)) {
                    undoStack.push({
                        type: 'move',
                        card: card,
                        oldX: original.left,
                        oldY: original.top,
                        newX: currentX,
                        newY: currentY
                    });
                    redoStack.length = 0;
                    updateUndoRedoButtons();
                }

                originalPositions.delete(card);
                clearGuides();

                document.removeEventListener('mousemove', drag);
                document.removeEventListener('mouseup', endDrag);
            }

            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', endDrag);

            e.preventDefault();
        });

        // ===== RESIZE HANDLE =====
        const resizeHandle = document.createElement("div");
        resizeHandle.className = "resize-handle";
        resizeHandle.textContent = "⇲";
        frame.appendChild(resizeHandle);

        resizeHandle.addEventListener('mousedown', function startResize(e) {
            isResizing = true;
            updateZIndex(card);

            const img = card.querySelector('img');
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = img.offsetWidth;
            const startHeight = img.offsetHeight;

            // CAPTURE ORIGINAL SIZE FOR UNDO
            originalImageSize = {
                card: card,
                width: img.style.width,
                height: img.style.height
            };

            function resize(ev) {
                if (!isResizing) return;

                const dx = ev.clientX - startX;
                const newWidth = Math.max(150, startWidth + dx);
                const ratio = startHeight / startWidth;

                img.style.width = newWidth + "px";
                img.style.height = (newWidth * ratio) + "px";

                window.updateCardDimensionsText?.(card);
            }

            function endResize() {
                if (!isResizing) return;
                isResizing = false;

                // SAVE TO UNDO STACK IF SIZE CHANGED
                if (originalImageSize && originalImageSize.card === card) {
                    const img = card.querySelector('img');
                    const newWidth = img.style.width;
                    const newHeight = img.style.height;

                    if (originalImageSize.width !== newWidth || originalImageSize.height !== newHeight) {
                        undoStack.push({
                            type: 'resize',
                            card: card,
                            oldWidth: originalImageSize.width,
                            oldHeight: originalImageSize.height,
                            newWidth: newWidth,
                            newHeight: newHeight
                        });
                        redoStack.length = 0;
                        updateUndoRedoButtons();
                    }

                    originalImageSize = null;
                }

                document.removeEventListener('mousemove', resize);
                document.removeEventListener('mouseup', endResize);
            }

            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', endResize);

            e.stopPropagation();
            e.preventDefault();
        });

        // ===== ROTATE HANDLE =====
        const rotateHandle = document.createElement("div");
        rotateHandle.className = "rotate-handle";
        rotateHandle.textContent = "↻";
        frame.appendChild(rotateHandle);

        rotateHandle.addEventListener('mousedown', function(e) {
            updateZIndex(card);
            
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
            const offset = startAngle - parseFloat(card.dataset.rotation);

            function rotateMove(ev) {
                let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
                let newRotation = angle - offset;

                if (ev.shiftKey) {
                    newRotation = Math.round(newRotation / 45) * 45;
                }

                card.dataset.rotation = newRotation;
                updateCardTransform(card);
                window.updateCardDimensionsText?.(card);
            }

            function rotateEnd() {
                document.removeEventListener('mousemove', rotateMove);
                document.removeEventListener('mouseup', rotateEnd);
            }

            document.addEventListener('mousemove', rotateMove);
            document.addEventListener('mouseup', rotateEnd);

            e.stopPropagation();
            e.preventDefault();
        });
    }

    /* ============ NAME TOGGLE ============ */
    
    function toggleNamesVisibility() {
        areNamesVisible = !areNamesVisible;
        document.querySelectorAll('.photo-caption')
                .forEach(c => c.style.display = areNamesVisible ? '' : 'none');
    }

    /* ============ MAGNETIC SNAPPING TOGGLE ============ */
    
    function toggleMagneticSnapping() {
        isMagneticSnappingEnabled = !isMagneticSnappingEnabled;
        const magnetBtn = document.getElementById('magnetToggleBtn');
        if (magnetBtn) {
            if (isMagneticSnappingEnabled) {
                magnetBtn.classList.add('active');
                magnetBtn.title = 'Magnetic snapping enabled';
            } else {
                magnetBtn.classList.remove('active');
                magnetBtn.title = 'Magnetic snapping disabled';
            }
        }
    }

    /* ============ FILE UPLOAD ============ */
    
    function handleFileUpload(e) {
        const files = e.target.files;
        const container = document.getElementById('photo-container');
        const addedCards = [];
        
        let filesProcessed = 0;
        
        for (let f of files) {
            if (f.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = ev => {
                    const card = createPhotoCard(ev.target.result, 'Custom Upload');
                    container.appendChild(card);
                    addedCards.push(card);
                    
                    filesProcessed++;
                    if (filesProcessed === files.length && addedCards.length > 0) {
                        // SAVE TO UNDO STACK
                        undoStack.push({
                            type: 'add',
                            cards: addedCards
                        });
                        redoStack.length = 0;
                        updateUndoRedoButtons();
                    }
                };
                reader.readAsDataURL(f);
            }
        }
    }

    /* ============ LOAD FROM CSV ============ */
    
    function addPhotosFromCSV(count) {
        const container = document.getElementById('photo-container');
        let added = 0;
        const addedCards = [];
        
        while (added < count && currentPhotoIndex < csvData.length) {
            const row = csvData[currentPhotoIndex];
            const card = createPhotoCard(row.link, row.photographer);
            container.appendChild(card);
            addedCards.push(card);
            added++;
            currentPhotoIndex++;
        }
        
        if (currentPhotoIndex >= csvData.length) {
            currentPhotoIndex = 0;
        }
        
        // SAVE TO UNDO STACK
        if (addedCards.length > 0) {
            undoStack.push({
                type: 'add',
                cards: addedCards
            });
            redoStack.length = 0;
            updateUndoRedoButtons();
        }
    }

    /* ============ KEYBOARD SHORTCUTS ============ */
    
    document.addEventListener('keydown', (e) => {
        // Undo: Cmd/Ctrl + Z
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undoLastAction();
            return;
        }

        // Redo: Cmd/Ctrl + Shift + Z
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            redoLastAction();
            return;
        }

        // Redo: Cmd/Ctrl + Y (alternative)
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            redoLastAction();
            return;
        }

        // Delete selected cards
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (e.target.tagName === 'INPUT') return;
            
            e.preventDefault();
            
            const cardsToRemove = selectedCards.size > 0
                ? Array.from(selectedCards)
                : [];

            cardsToRemove.forEach(card => {
                undoStack.push({
                    type: 'remove',
                    card: card
                });
                redoStack.length = 0;

                card.remove();
                selectedCards.delete(card);
            });

            updateUndoRedoButtons();
        }
    });

    /* ============ INITIALIZATION ============ */
    
    window.onload = function() {
        loadCSVData();
        
        // Upload button
        const uploadBtn = document.getElementById("uploadPhotoBtn");
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = "image/*";
        input.style.display = "none";
        input.onchange = handleFileUpload;
        document.body.appendChild(input);
        uploadBtn.onclick = () => input.click();
        
        // Add photo buttons
        document.getElementById('add5PhotosBtn').onclick = () => addPhotosFromCSV(5);
        document.getElementById('add1PhotoBtn').onclick = () => addPhotosFromCSV(1);
        
        // Names toggle
        const namesBtn = document.querySelector('[title="Names"]');
        if (namesBtn) namesBtn.onclick = toggleNamesVisibility;
        
        // Magnet toggle
        const magnetBtn = document.getElementById('magnetToggleBtn');
        if (magnetBtn) {
            magnetBtn.onclick = toggleMagneticSnapping;
        }
        
        // Undo/Redo buttons
        const undoBtn = document.querySelector('.toolbar-icon[title="Undo"]');
        const redoBtn = document.querySelector('.toolbar-icon[title="Redo"]');
        
        if (undoBtn) undoBtn.onclick = undoLastAction;
        if (redoBtn) redoBtn.onclick = redoLastAction;
        
        updateUndoRedoButtons();
    };

})();
