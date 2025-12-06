// Grid snap functionality
(function() {
    let isGridLocked = false;
    let isInGridMode = false;
    let gridCards = [];
    let draggedCard = null;
    let draggedIndex = -1;
    let isDraggingInGrid = false;

    function updateCardTransform(card) {
        const x = parseFloat(card.dataset.x);
        const y = parseFloat(card.dataset.y);
        const rotation = parseFloat(card.dataset.rotation);
        card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }

    function snapToGrid() {
        const cards = document.querySelectorAll('.photo-card');
        const cardCount = cards.length;
        if (cardCount === 0) return;
        
        // Sort cards by their current vertical position (top to bottom, left to right)
        const cardArray = Array.from(cards);
        cardArray.sort((a, b) => {
            const aY = parseFloat(a.dataset.y) || 0;
            const bY = parseFloat(b.dataset.y) || 0;
            const aX = parseFloat(a.dataset.x) || 0;
            const bX = parseFloat(b.dataset.x) || 0;
            
            // If roughly same Y position (within 100px), sort by X
            if (Math.abs(aY - bY) < 100) {
                return aX - bX;
            }
            return aY - bY;
        });
        
        gridCards = cardArray;
        isInGridMode = true;
        
        // Enable scrolling when in grid mode
        const contentArea = document.querySelector('.content-area');
        contentArea.style.overflow = 'auto';
        
        arrangeCardsInGrid();
    }

    function arrangeCardsInGrid() {
        const containerWidth = window.innerWidth;
        const spacing = 20;
        const startX = 50;
        let currentY = 150;
        let currentX = startX;
        let rowHeight = 0;
        
        gridCards.forEach((card) => {
            const img = card.querySelector('img');
            const cardWidth = img.offsetWidth || 300;
            const cardHeight = img.offsetHeight || 400;
            
            if (currentX + cardWidth > containerWidth - 50 && currentX > startX) {
                currentY += rowHeight + spacing;
                currentX = startX;
                rowHeight = 0;
            }
            
            card.dataset.x = currentX;
            card.dataset.y = currentY;
            card.dataset.rotation = 0;
            
            updateCardTransform(card);
            
            currentX += cardWidth + spacing;
            rowHeight = Math.max(rowHeight, cardHeight);
        });
    }

    function toggleGridLock() {
        isGridLocked = !isGridLocked;
        const lockBtn = document.querySelector('[title="Lock grid"]');
        const contentArea = document.querySelector('.content-area');
        
        if (isGridLocked) {
            // Snap to grid first if not already in grid mode
            if (!isInGridMode) {
                snapToGrid();
            }
            
            // Change icon to locked
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
            
            // Enable scrolling
            contentArea.style.overflow = 'auto';
            
            // Disable free drag/resize/rotate and enable grid slide
            const cards = document.querySelectorAll('.photo-card');
            cards.forEach(card => {
                // Disable normal dragging
                card.style.pointerEvents = 'auto';
                
                // Hide resize and rotate handles
                const resizeHandle = card.querySelector('.resize-handle');
                const rotateHandle = card.querySelector('.rotate-handle');
                if (resizeHandle) resizeHandle.style.display = 'none';
                if (rotateHandle) rotateHandle.style.display = 'none';
                
                enableGridDrag(card);
            });
        } else {
            // Change icon to unlocked
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';
            
            // Keep scrolling if in grid mode
            if (isInGridMode) {
                contentArea.style.overflow = 'auto';
            } else {
                contentArea.style.overflow = 'hidden';
            }
            
            // Re-enable handles and disable grid dragging
            const cards = document.querySelectorAll('.photo-card');
            cards.forEach(card => {
                const resizeHandle = card.querySelector('.resize-handle');
                const rotateHandle = card.querySelector('.rotate-handle');
                if (resizeHandle) resizeHandle.style.display = '';
                if (rotateHandle) rotateHandle.style.display = '';
                
                disableGridDrag(card);
            });
        }
    }

    function enableGridDrag(card) {
        card.style.cursor = 'grab';
        card.draggable = true;
        
        card.ondragstart = function(e) {
            draggedCard = this;
            draggedIndex = gridCards.indexOf(this);
            this.style.opacity = '0.5';
            isDraggingInGrid = true;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', this.innerHTML);
        };
        
        card.ondragend = function(e) {
            this.style.opacity = '1';
            isDraggingInGrid = false;
            
            const cards = document.querySelectorAll('.photo-card');
            cards.forEach(c => c.classList.remove('drag-over'));
        };
        
        card.ondragover = function(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            
            const cards = document.querySelectorAll('.photo-card');
            cards.forEach(c => c.classList.remove('drag-over'));
            this.classList.add('drag-over');
            
            return false;
        };
        
        card.ondrop = function(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            
            if (draggedCard !== this) {
                const dropIndex = gridCards.indexOf(this);
                
                // Remove from old position
                gridCards.splice(draggedIndex, 1);
                
                // Insert at new position
                gridCards.splice(dropIndex, 0, draggedCard);
                
                // Rearrange grid
                arrangeCardsInGrid();
            }
            
            return false;
        };
    }

    function disableGridDrag(card) {
        card.style.cursor = 'move';
        card.draggable = false;
        card.ondragstart = null;
        card.ondragend = null;
        card.ondragover = null;
        card.ondrop = null;
    }

    // Initialize grid button when page loads
    window.addEventListener('load', function() {
        const gridBtn = document.querySelector('[title="Grid"]');
        if (gridBtn) {
            gridBtn.onclick = function() {
                snapToGrid();
            };
        }
        
        const lockBtn = document.querySelector('[title="Lock grid"]');
        if (lockBtn) {
            // Set initial icon to unlocked
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';
            
            lockBtn.onclick = function() {
                toggleGridLock();
            };
        }
    });
})();
