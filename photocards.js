(function() {
    let photoCards = [];
    let csvData = [];
    let currentPhotoIndex = 0;
    let activeCard = null;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;
    let areNamesVisible = false;
    
    // 💡 NEW: Selection Tracking Set
    const selectedCards = new Set();
    /* ============ SELECTION FUNCTIONS ============ */
    
    // Function to handle adding/removing the 'selected' class
    function handleCardSelection(card, event) {
        // Prevent selection when interacting with drag/resize handles
        if (event.target.closest('.resize-handle') || event.target.closest('.rotate-handle')) {
            return;
        }
        const isCurrentlySelected = card.classList.contains('selected');
        
        // Handle multi-select with Ctrl/Cmd or Shift
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            // Clear all others unless the clicked card was already the only one selected
            if (!isCurrentlySelected || selectedCards.size > 1) {
                selectedCards.forEach(c => {
                    c.classList.remove('selected');
                });
                selectedCards.clear();
            }
        }
        
        // Toggle selection status
        if (isCurrentlySelected) {
            card.classList.remove('selected');
            selectedCards.delete(card);
        } else {
            card.classList.add('selected');
            selectedCards.add(card);
        }
    }
    
    // 💡 NEW: Global function to expose selected cards
    window.getSelectedCards = () => Array.from(selectedCards);
    /* ============ DIMENSION HELPER ============ */
    // Returns separate measurements for picture and frame
    window.getCardDimensions = function(card) {
        const img = card.querySelector("img");
        const frame = card.querySelector(".photo-frame");
        
        if (!img || !frame) return null;
        
        // Picture dimensions (actual image only)
        const pictureWidth = img.offsetWidth;
        const pictureHeight = img.offsetHeight;
        
        // Frame dimensions (includes matte and frame border)
        const frameWidth = frame.offsetWidth;
        const frameHeight = frame.offsetHeight;
        
        return {
            picture: { width: pictureWidth, height: pictureHeight },
            frame: { width: frameWidth, height: frameHeight }
        };
    };

    /* ============ EDITABLE DIMENSIONS ============ */
    // Opens a modal/input to let user set custom picture dimensions
    function openDimensionEditor(card) {
        const wall = document.getElementById("wall");
        if (!window.currentWallInches || !wall) {
            alert("Please build a wall first to set dimensions.");
            return;
        }

        const img = card.querySelector("img");
        if (!img) return;

        const scaleX = window.currentWallInches.width / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        // Current picture dimensions in inches
        const currentWIn = (img.offsetWidth * scaleX).toFixed(2);
        const currentHIn = (img.offsetHeight * scaleY).toFixed(2);

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'dimension-editor-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
        `;

        const modal = document.createElement('div');
        modal.className = 'dimension-editor-modal';
        modal.style.cssText = `
            background: #2a2a2a;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            min-width: 300px;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Set Picture Dimensions</h3>
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div style="flex: 1;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">Width (inches)</label>
                    <input type="number" id="dimEditorWidth" value="${currentWIn}" step="0.1" min="0.1" 
                        style="width: 100%; padding: 8px 12px; border: 1px solid #444; border-radius: 6px; 
                        background: #333; color: #fff; font-size: 14px; box-sizing: border-box;">
                </div>
                <div style="flex: 1;">
                    <label style="display: block; font-size: 12px; color: #aaa; margin-bottom: 4px;">Height (inches)</label>
                    <input type="number" id="dimEditorHeight" value="${currentHIn}" step="0.1" min="0.1"
                        style="width: 100%; padding: 8px 12px; border: 1px solid #444; border-radius: 6px; 
                        background: #333; color: #fff; font-size: 14px; box-sizing: border-box;">
                </div>
            </div>
            <div style="margin-bottom: 16px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
                    <input type="checkbox" id="dimEditorLockRatio" checked 
                        style="width: 16px; height: 16px; cursor: pointer;">
                    <span>Lock aspect ratio</span>
                </label>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button id="dimEditorCancel" style="padding: 8px 16px; border: 1px solid #444; border-radius: 6px; 
                    background: transparent; color: #fff; cursor: pointer; font-size: 14px;">Cancel</button>
                <button id="dimEditorApply" style="padding: 8px 16px; border: none; border-radius: 6px; 
                    background: #007AFF; color: #fff; cursor: pointer; font-size: 14px; font-weight: 500;">Apply</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const widthInput = modal.querySelector('#dimEditorWidth');
        const heightInput = modal.querySelector('#dimEditorHeight');
        const lockRatioCheckbox = modal.querySelector('#dimEditorLockRatio');
        const cancelBtn = modal.querySelector('#dimEditorCancel');
        const applyBtn = modal.querySelector('#dimEditorApply');

        const originalRatio = parseFloat(currentHIn) / parseFloat(currentWIn);
        let lastChangedInput = null;

        // Handle ratio locking
        widthInput.addEventListener('input', () => {
            lastChangedInput = 'width';
            if (lockRatioCheckbox.checked) {
                const newWidth = parseFloat(widthInput.value) || 0;
                heightInput.value = (newWidth * originalRatio).toFixed(2);
            }
        });

        heightInput.addEventListener('input', () => {
            lastChangedInput = 'height';
            if (lockRatioCheckbox.checked) {
                const newHeight = parseFloat(heightInput.value) || 0;
                widthInput.value = (newHeight / originalRatio).toFixed(2);
            }
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Cancel button
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
        });

        // Apply button
        applyBtn.addEventListener('click', () => {
            const newWidthIn = parseFloat(widthInput.value);
            const newHeightIn = parseFloat(heightInput.value);

            if (isNaN(newWidthIn) || isNaN(newHeightIn) || newWidthIn <= 0 || newHeightIn <= 0) {
                alert("Please enter valid positive numbers for dimensions.");
                return;
            }

            // Convert inches to pixels using wall scale
            const pixelsPerInchX = wall.offsetWidth / window.currentWallInches.width;
            const pixelsPerInchY = wall.offsetHeight / window.currentWallInches.height;

            // Use average scale for uniform sizing
            const pixelsPerInch = (pixelsPerInchX + pixelsPerInchY) / 2;

            const newWidthPx = newWidthIn * pixelsPerInch;
            const newHeightPx = newHeightIn * pixelsPerInch;

            img.style.width = newWidthPx + "px";
            img.style.height = newHeightPx + "px";

            // Update the dimensions display
            window.updateCardDimensionsText?.(card);

            overlay.remove();
        });

        // Focus the width input
        widthInput.focus();
        widthInput.select();

        // Handle Enter key
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            } else if (e.key === 'Escape') {
                overlay.remove();
            }
        });
    }

    // Expose for use by frame-system.js
    window.openDimensionEditor = openDimensionEditor;

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
    function createPhotoCard(imageUrl, photographer, isUploaded) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        /* WRAP IMAGE IN PHOTO-FRAME */
        const frame = document.createElement('div');
        frame.className = 'photo-frame';
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = photographer;
        img.onload = function() {
            const ratio = img.naturalHeight / img.naturalWidth;
            img.style.width = "300px";
            img.style.height = (300 * ratio) + "px";
            
            // Update dimensions if they're visible
            window.updateCardDimensionsText?.(card);
        };
        frame.appendChild(img);
        card.appendChild(frame);
        /* CAPTION BELOW IMAGE */
        const caption = document.createElement('div');
        caption.className = 'photo-caption';
        caption.textContent = photographer || 'Unknown';
        caption.style.display = areNamesVisible ? '' : 'none';
        card.appendChild(caption);
        /* DIMENSIONS LABEL - Shows TWO lines when visible:
           Line 1: Picture dimensions (actual image) - CLICKABLE
           Line 2: Frame dimensions (picture + matte + frame border) */
        const dim = document.createElement('div');
        dim.className = 'photo-dimensions';
        dim.style.display = 'none'; // hidden until toggled
        
        // Create two separate spans for the two lines
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
            pictureDimSpan.style.background = 'rgba(255,255,255,0.2)';
        });
        pictureDimSpan.addEventListener('mouseleave', () => {
            pictureDimSpan.style.background = 'transparent';
        });
        
        // Click handler to open dimension editor
        pictureDimSpan.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card selection
            openDimensionEditor(card);
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
        
        makeCardInteractive(card);
        return card;
    }
    /* ============ CARD INTERACTIVITY ============ */
    function makeCardInteractive(card) {
        card.dataset.rotation = "0";
        const randX = Math.random() * (window.innerWidth - 400) + 50;
        const randY = Math.random() * (window.innerHeight - 400) + 150;
        card.dataset.x = randX;
        card.dataset.y = randY;
        updateCardTransform(card);
        
        // 💡 NEW: Attach selection handler to the card
        card.addEventListener('click', (e) => handleCardSelection(card, e));
        card.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            if (e.target.classList.contains('rotate-handle')) return;
            
            // Allow drag only if the target isn't a caption (to allow text selection)
            if (e.target.classList.contains('photo-caption')) return;
            // Prevent drag when clicking on editable dimension span
            if (e.target.classList.contains('picture-dimensions')) return;
            
            isDragging = true;
            activeCard = card;
            dragOffset.x = e.clientX - parseFloat(card.dataset.x);
            dragOffset.y = e.clientY - parseFloat(card.dataset.y);
            card.style.zIndex = getHighestZIndex() + 1;
            e.preventDefault();
        });
        /* HANDLE CREATION (Resize & Rotate) */
        const frame = card.querySelector('.photo-frame');
        const resizeHandle = document.createElement("div");
        resizeHandle.className = "resize-handle";
        resizeHandle.textContent = "⇲";
        frame.appendChild(resizeHandle);
        resizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            activeCard = card;
            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            const img = card.querySelector('img');
            resizeStartWidth = img.offsetWidth;
            resizeStartHeight = img.offsetHeight;
            e.stopPropagation();
            e.preventDefault();
        });
        const rotateHandle = document.createElement("div");
        rotateHandle.className = "rotate-handle";
        rotateHandle.textContent = "↻";
        frame.appendChild(rotateHandle);
        rotateHandle.addEventListener('mousedown', function(e) {
            activeCard = card;
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
            const offset = startAngle - parseFloat(card.dataset.rotation);
            function rotateMove(ev) {
                const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
                card.dataset.rotation = angle - offset;
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
    function updateCardTransform(card) {
        card.style.transform = 
            `translate(${card.dataset.x}px, ${card.dataset.y}px) rotate(${card.dataset.rotation}deg)`;
    }
    function getHighestZIndex() {
        let max = 1000;
        document.querySelectorAll('.photo-card').forEach(c => {
            const z = parseInt(c.style.zIndex) || 1000;
            if (z > max) max = z;
        });
        return max;
    }
    /* DRAG & RESIZE */
    document.addEventListener('mousemove', function(e) {
        if (isDragging && activeCard) {
            activeCard.dataset.x = e.clientX - dragOffset.x;
            activeCard.dataset.y = e.clientY - dragOffset.y;
            updateCardTransform(activeCard);
            window.updateCardDimensionsText?.(activeCard);
        }
        if (isResizing && activeCard) {
            const img = activeCard.querySelector('img');
            const dx = e.clientX - resizeStartX;
            const newWidth = Math.max(150, resizeStartWidth + dx);
            const ratio = resizeStartHeight / resizeStartWidth;
            img.style.width = newWidth + "px";
            img.style.height = (newWidth * ratio) + "px";
            
            window.updateCardDimensionsText?.(activeCard);
        }
    });
    document.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        activeCard = null;
    });
    /* NAME TOGGLE */
    function setNamesVisibility(v) {
        areNamesVisible = v;
        document.querySelectorAll('.photo-caption')
                .forEach(c => c.style.display = v ? '' : 'none');
    }
    function toggleNamesVisibility() {
        setNamesVisibility(!areNamesVisible);
    }
    /* FILE UPLOAD */
    function handleFileUpload(e) {
        const files = e.target.files;
        const container = document.getElementById('photo-container');
        for (let f of files) {
            if (f.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = ev => {
                    const card = createPhotoCard(ev.target.result, 'Custom Upload', true);
                    container.appendChild(card);
                };
                reader.readAsDataURL(f);
            }
        }
    }
    /* LOAD FROM CSV */
    function addPhotosFromCSV(count) {
        const container = document.getElementById('photo-container');
        let added = 0;
        while (added < count && currentPhotoIndex < csvData.length) {
            const row = csvData[currentPhotoIndex];
            const card = createPhotoCard(row.link, row.photographer, false);
            container.appendChild(card);
            added++;
            currentPhotoIndex++;
        }
        if (currentPhotoIndex >= csvData.length) {
            currentPhotoIndex = 0;
        }
    }
    window.onload = function() {
        loadCSVData();
        const uploadBtn = document.getElementById("uploadPhotoBtn");
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = "image/*";
        input.style.display = "none";
        input.onchange = handleFileUpload;
        document.body.appendChild(input);
        uploadBtn.onclick = () => input.click();
        document.getElementById('add5PhotosBtn').onclick = () => addPhotosFromCSV(5);
        document.getElementById('add1PhotoBtn').onclick = () => addPhotosFromCSV(1);
        const namesBtn = document.querySelector('[title="Names"]');
        if (namesBtn) namesBtn.onclick = toggleNamesVisibility;
    };
})();
