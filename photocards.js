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

    async function loadCSVData() {
        try {
            const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv');
            const csvText = await response.text();
            const rows = csvText.split('\n');
            csvData = rows.slice(1).filter(row => row.trim()).map(row => {
                const [link, photographer] = row.split(',');
                return { link: link ? link.trim() : '', photographer: photographer ? photographer.trim() : 'Unknown' };
            });
        } catch (error) {
            console.error('Error loading CSV:', error);
        }
    }

    function makeCardInteractive(card) {
        // Store transform state
        card.dataset.rotation = '0';
        
        // Random initial position
        const randomX = Math.random() * (window.innerWidth - 400) + 50;
        const randomY = Math.random() * (window.innerHeight - 400) + 150;
        card.dataset.x = randomX;
        card.dataset.y = randomY;
        
        updateCardTransform(card);

        // Drag functionality
        card.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('resize-handle') ||
                e.target.classList.contains('rotate-handle')) {
                return;
            }
            
            isDragging = true;
            activeCard = card;
            
            // Get current position from transform
            const currentX = parseFloat(card.dataset.x) || 0;
            const currentY = parseFloat(card.dataset.y) || 0;
            
            // Calculate offset from current position
            dragOffset.x = e.clientX - currentX;
            dragOffset.y = e.clientY - currentY;
            
            card.style.zIndex = getHighestZIndex() + 1;
            e.preventDefault();
        });

        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '⇲';
        card.appendChild(resizeHandle);

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

        // Add rotate handle
        const rotateHandle = document.createElement('div');
        rotateHandle.className = 'rotate-handle';
        rotateHandle.innerHTML = '↻';
        card.appendChild(rotateHandle);

        let rotateStartAngle = 0;
        rotateHandle.addEventListener('mousedown', function(e) {
            activeCard = card;
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
            rotateStartAngle = startAngle - parseFloat(card.dataset.rotation);
            
            function rotateMove(e) {
                const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
                card.dataset.rotation = currentAngle - rotateStartAngle;
                updateCardTransform(card);
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
        const x = parseFloat(card.dataset.x);
        const y = parseFloat(card.dataset.y);
        const rotation = parseFloat(card.dataset.rotation);
        card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }

    function getHighestZIndex() {
        const cards = document.querySelectorAll('.photo-card');
        let highest = 1000;
        cards.forEach(card => {
            const z = parseInt(card.style.zIndex) || 1000;
            if (z > highest) highest = z;
        });
        return highest;
    }

    // Global mouse move handler
    document.addEventListener('mousemove', function(e) {
        if (isDragging && activeCard) {
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            activeCard.dataset.x = x;
            activeCard.dataset.y = y;
            updateCardTransform(activeCard);
        }
        
        if (isResizing && activeCard) {
            const img = activeCard.querySelector('img');
            const deltaX = e.clientX - resizeStartX;
            const deltaY = e.clientY - resizeStartY;
            
            const newWidth = Math.max(150, resizeStartWidth + deltaX);
            const aspectRatio = resizeStartHeight / resizeStartWidth;
            const newHeight = newWidth * aspectRatio;
            
            img.style.width = newWidth + 'px';
            img.style.height = newHeight + 'px';
        }
    });

    // Global mouse up handler
    document.addEventListener('mouseup', function() {
        isDragging = false;
        isResizing = false;
        activeCard = null;
    });

    function createPhotoCard(imageUrl, photographer, isUploaded) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = photographer;
        
        // Load image to get natural aspect ratio
        img.onload = function() {
            const aspectRatio = img.naturalHeight / img.naturalWidth;
            const width = 300;
            img.style.width = width + 'px';
            img.style.height = (width * aspectRatio) + 'px';
        };
        
        card.appendChild(img);
        
        makeCardInteractive(card);
        
        return card;
    }

    function handleFileUpload(event) {
        const files = event.target.files;
        const container = document.getElementById('photo-container');
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const card = createPhotoCard(e.target.result, 'Custom Upload', true);
                    container.appendChild(card);
                };
                reader.readAsDataURL(file);
            }
        }
    }

    function addPhotosFromCSV(count) {
        if (csvData.length === 0) {
            alert('Loading photos... please try again in a moment.');
            return;
        }
        const container = document.getElementById('photo-container');
        let added = 0;
        while (added < count && currentPhotoIndex < csvData.length) {
            const photo = csvData[currentPhotoIndex];
            const card = createPhotoCard(photo.link, photo.photographer, false);
            container.appendChild(card);
            currentPhotoIndex++;
            added++;
        }
        if (currentPhotoIndex >= csvData.length) {
            currentPhotoIndex = 0;
        }
    }

    window.onload = function() {
        loadCSVData();

        const uploadBtn = document.getElementById('uploadPhotoBtn');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.onchange = handleFileUpload;
        document.body.appendChild(fileInput);
        
        uploadBtn.onclick = function() {
            fileInput.click();
        };

        document.getElementById('add5PhotosBtn').onclick = function() {
            addPhotosFromCSV(5);
        };

        document.getElementById('add1PhotoBtn').onclick = function() {
            addPhotosFromCSV(1);
        };
    };
})();
