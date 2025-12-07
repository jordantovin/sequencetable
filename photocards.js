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
           Line 1: Picture dimensions (actual image)
           Line 2: Frame dimensions (picture + matte + frame border) */
        const dim = document.createElement('div');
        dim.className = 'photo-dimensions';
        dim.style.display = 'none'; // hidden until toggled
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
