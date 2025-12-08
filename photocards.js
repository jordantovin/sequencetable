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

    /* ============ INLINE EDITABLE DIMENSIONS ============ */
    // Converts the dimension text to inline input fields
    function makeInlineEditable(card, pictureDimSpan) {
        const wall = document.getElementById("wall");
        if (!window.currentWallInches || !wall) {
            alert("Please build a wall first to set dimensions.");
            return;
        }

        const img = card.querySelector("img");
        if (!img) return;

        // Already editing? Don't create new inputs
        if (pictureDimSpan.querySelector('input')) return;

        const scaleX = window.currentWallInches.width / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        // Get the current measurement unit
        const measurementUnitEl = document.getElementById("measurementUnit");
        const displayUnit = measurementUnitEl ? measurementUnitEl.value : "in";

        // Current picture dimensions in inches first
        const picWIn = img.offsetWidth * scaleX;
        const picHIn = img.offsetHeight * scaleY;

        // Convert to display unit
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

        // Create inline inputs
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

        // Auto-lock aspect ratio: changing width updates height
        widthInput.addEventListener('input', () => {
            const newWidth = parseFloat(widthInput.value) || 0;
            heightInput.value = displayUnit === 'mm' 
                ? (newWidth * aspectRatio).toFixed(1)
                : (newWidth * aspectRatio).toFixed(2);
        });

        // Auto-lock aspect ratio: changing height updates width
        heightInput.addEventListener('input', () => {
            const newHeight = parseFloat(heightInput.value) || 0;
            widthInput.value = displayUnit === 'mm'
                ? (newHeight / aspectRatio).toFixed(1)
                : (newHeight / aspectRatio).toFixed(2);
        });

        // Apply on Enter key
        function applyChanges() {
            let newWidthIn, newHeightIn;
            const inputW = parseFloat(widthInput.value);
            const inputH = parseFloat(heightInput.value);

            if (isNaN(inputW) || isNaN(inputH) || inputW <= 0 || inputH <= 0) {
                // Revert to original
                window.updateCardDimensionsText?.(card);
                return;
            }

            // Convert input values to inches
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

            // Update display back to text
            window.updateCardDimensionsText?.(card);
        }

        // Handle keydown events
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

        // Apply on blur (clicking away)
        function handleBlur(e) {
            // Small delay to check if focus moved to the other input
            setTimeout(() => {
                const activeEl = document.activeElement;
                if (activeEl !== widthInput && activeEl !== heightInput) {
                    applyChanges();
                }
            }, 100);
        }

        widthInput.addEventListener('blur', handleBlur);
        heightInput.addEventListener('blur', handleBlur);

        // Prevent drag when clicking inputs
        widthInput.addEventListener('mousedown', e => e.stopPropagation());
        heightInput.addEventListener('mousedown', e => e.stopPropagation());

        // Focus the width input
        widthInput.focus();
        widthInput.select();
    }

    // Expose for use by dimensions.js
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
           Line 1: Picture dimensions (actual image) - CLICKABLE to edit inline
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
            // Prevent drag when clicking on editable dimension span or inputs
            if (e.target.classList.contains('picture-dimensions')) return;
            if (e.target.classList.contains('dim-input')) return;
            
            isDragging = true;
            activeCard = card;
            dragOffset.x = e.clientX - parseFloat(card.dataset.x);
            dragOffset.y = e.clientY - parseFloat(card.dataset.y);
            card.style.zIndex = getHighestZIndex() + 1;
            e.preventDefault();
        });
        /* HANDLE CREATION (Resize & Rotate) - positioned OUTSIDE the frame corners */
        const frame = card.querySelector('.photo-frame');
        
        const resizeHandle = document.createElement("div");
        resizeHandle.className = "resize-handle";
        resizeHandle.textContent = "⇲";
        frame.appendChild(resizeHandle); // Append to frame for correct positioning
        
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
        frame.appendChild(rotateHandle); // Append to frame for correct positioning
        
        rotateHandle.addEventListener('mousedown', function(e) {
            activeCard = card;
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
            const offset = startAngle - parseFloat(card.dataset.rotation);
            
            function rotateMove(ev) {
                let angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
                let newRotation = angle - offset;
                
                // Snap to 45° increments when holding Shift
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
