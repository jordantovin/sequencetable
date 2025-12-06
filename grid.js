// Grid snap functionality
(function() {
    let isGridLocked = false;
    let gridCards = [];
    let slideCard = null;
    let slideIndex = -1;
    let swapTargetIndex = -1;
    let slideOffsetX = 0;
    let slideOffsetY = 0;
    let isSliding = false;

    // Expose this globally so app.js can check it
    window.isGridLocked = function() {
        return isGridLocked;
    };

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
        
        // Get ALL cards currently on screen
        const cardArray = Array.from(cards);
        
        // Sort by current position (top to bottom, left to right)
        cardArray.sort((a, b) => {
            const aY = parseFloat(a.dataset.y) || 0;
            const bY = parseFloat(b.dataset.y) || 0;
            const aX = parseFloat(a.dataset.x) || 0;
            const bX = parseFloat(b.dataset.x) || 0;
            
            if (Math.abs(aY - bY) < 100) {
                return aX - bX;
            }
            return aY - bY;
        });
        
        gridCards = cardArray;
        
        // Enable scrolling
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
            
            // Check if card fits in current row
            if (currentX + cardWidth > containerWidth - 50 && currentX > startX) {
                // Move to next row
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
            // SNAP TO GRID when locking
            snapToGrid();
            
            // Change icon to locked
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';
            
            contentArea.style.overflow = 'auto';
            
            // Hide handles and enable sliding
            gridCards.forEach(card => {
                const resizeHandle = card.querySelector('.resize-handle');
                const rotateHandle = card.querySelector('.rotate-handle');
                if (resizeHandle) resizeHandle.style.display = 'none';
                if (rotateHandle) rotateHandle.style.display = 'none';
                
                card.style.cursor = 'grab';
                card.dataset.gridLocked = 'true';
            });
            
        } else {
            // Change icon to unlocked
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';
            
            contentArea.style.overflow = 'auto';
            
            // Show handles and disable sliding
            gridCards.forEach(card => {
                const resizeHandle = card.querySelector('.resize-handle');
                const rotateHandle = card.querySelector('.rotate-handle');
                if (resizeHandle) resizeHandle.style.display = '';
                if (rotateHandle) rotateHandle.style.display = '';
                
                card.style.cursor = 'move';
                delete card.dataset.gridLocked;
            });
        }
    }

    // Mouse handlers for sliding
    document.addEventListener('mousedown', function(e) {
        if (!isGridLocked) return;
        
        const card = e.target.closest('.photo-card');
        if (!card || !card.dataset.gridLocked) return;
        
        isSliding = true;
        slideCard = card;
        slideIndex = gridCards.indexOf(card);
        
        const currentX = parseFloat(card.dataset.x) || 0;
        const currentY = parseFloat(card.dataset.y) || 0;
        
        slideOffsetX = e.clientX - currentX;
        slideOffsetY = e.clientY - currentY;
        
        card.style.cursor = 'grabbing';
        card.style.zIndex = 10000;
        card.style.opacity = '0.7';
        
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isSliding || !slideCard) return;
        
        const x = e.clientX - slideOffsetX;
        const y = e.clientY - slideOffsetY;
        
        slideCard.dataset.x = x;
        slideCard.dataset.y = y;
        updateCardTransform(slideCard);
        
        // Find which card we're hovering over
        swapTargetIndex = -1;
        gridCards.forEach((card, index) => {
            if (card === slideCard) return;
            
            const rect = card.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                swapTargetIndex = index;
                card.style.opacity = '0.5';
            } else {
                card.style.opacity = '1';
            }
        });
    });

    document.addEventListener('mouseup', function(e) {
        if (!isSliding || !slideCard) return;
        
        isSliding = false;
        slideCard.style.cursor = 'grab';
        slideCard.style.zIndex = '';
        slideCard.style.opacity = '1';
        
        // Reset all opacities
        gridCards.forEach(card => {
            card.style.opacity = '1';
        });
        
        // Swap if we found a target
        if (swapTargetIndex !== -1 && swapTargetIndex !== slideIndex) {
            const temp = gridCards[slideIndex];
            gridCards[slideIndex] = gridCards[swapTargetIndex];
            gridCards[swapTargetIndex] = temp;
        }
        
        // Rearrange grid
        arrangeCardsInGrid();
        
        slideCard = null;
        slideIndex = -1;
        swapTargetIndex = -1;
    });

    // Initialize buttons
    window.addEventListener('load', function() {
        const gridBtn = document.querySelector('[title="Grid"]');
        if (gridBtn) {
            gridBtn.onclick = function() {
                snapToGrid();
            };
        }
        
        const lockBtn = document.querySelector('[title="Lock grid"]');
        if (lockBtn) {
            lockBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg>';
            
            lockBtn.onclick = function() {
                toggleGridLock();
            };
        }
    });
})();
