// ==========================
// GRID SNAP / GRID LOCK SYSTEM
// ==========================

(function() {

    let isGridLocked = false;
    let gridCards = [];
    let slideCard = null;
    let slideIndex = -1;
    let slideOffsetX = 0;
    let slideOffsetY = 0;
    let isSliding = false;

    // Make lock-state readable from app.js
    window.isGridLocked = () => isGridLocked;

    // ------------------------------
    // Utility
    // ------------------------------
    function updateCardTransform(card) {
        const x = parseFloat(card.dataset.x);
        const y = parseFloat(card.dataset.y);
        const rotation = parseFloat(card.dataset.rotation);
        card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    }

    // ------------------------------
    // Snap-to-grid ordering
    // ------------------------------
    function snapToGrid() {
        const cards = [...document.querySelectorAll('.photo-card')];
        if (!cards.length) return;

        // Sort by layout position
        cards.sort((a, b) => {
            const aY = parseFloat(a.dataset.y) || 0;
            const bY = parseFloat(b.dataset.y) || 0;
            const aX = parseFloat(a.dataset.x) || 0;
            const bX = parseFloat(b.dataset.x) || 0;

            if (Math.abs(aY - bY) < 100) return aX - bX;
            return aY - bY;
        });

        gridCards = cards;

        document.querySelector('.content-area').style.overflow = 'auto';

        arrangeCardsInGrid();
    }

    // ------------------------------
    // Actual grid placement
    // ------------------------------
    function arrangeCardsInGrid(skipSlidingCard = false) {
        const containerWidth = window.innerWidth;
        const spacing = 20;
        const startX = 50;
        
        // Extra space reserved for the name tag below the image
        const nameSpace = 40; 

        let x = startX;
        let y = 150;
        let rowHeight = 0;

        // Filter out the sliding card if needed (for clean layout during drag)
        const cardsToArrange = skipSlidingCard ? gridCards.filter(card => card !== slideCard) : gridCards;

        cardsToArrange.forEach(card => {
            const img = card.querySelector('img');

            const w = img.offsetWidth || 300;
            const h = img.offsetHeight || 400;

            // Calculate total height including the name space
            const totalCardHeight = h + nameSpace;

            // Wrap to next row
            if (x + w > containerWidth - 50 && x > startX) {
                y += rowHeight + spacing;
                x = startX;
                rowHeight = 0;
            }

            // Only update position if we are not actively sliding this card
            if (card !== slideCard || !isSliding) { 
                card.dataset.x = x;
                card.dataset.y = y;
                card.dataset.rotation = 0;
                updateCardTransform(card);
            }

            x += w + spacing;
            
            rowHeight = Math.max(rowHeight, totalCardHeight);
        });
    }

    // ------------------------------
    // Logic to apply the lock state (REPLACED toggleGridLock)
    // ------------------------------
    function updateLockState(locked) {
        const lockBtn = document.querySelector('[title="Lock grid"]');
        const contentArea = document.querySelector('.content-area');
        contentArea.style.overflow = 'auto';

        if (locked) {
            // LOCKED state: Apply grid and locked visuals
            snapToGrid();

            lockBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1
                    0-2 .9-2 2v10c0 1.1.9 2 2
                    2h12c1.1 0 2-.9
                    2-2V10c0-1.1-.9-2-2-2zm-6
                    9c-1.1 0-2-.9-2-2s.9-2
                    2-2 2 .9 2 2-.9 2-2
                    2zm3.1-9H8.9V6c0-1.71 1.39-3.1
                    3.1-3.1 1.71 0 3.1 1.39
                    3.1 3.1v2z"/>
                </svg>
            `;

            // Lock all cards visuals
            gridCards.forEach(card => {
                card.dataset.gridLocked = 'true';

                const rh = card.querySelector('.resize-handle');
                const oh = card.querySelector('.rotate-handle');
                if (rh) rh.style.display = 'none';
                if (oh) oh.style.display = 'none';

                card.style.cursor = 'grab';
            });

        } else {
            // UNLOCKED state: Remove grid and restore move visuals
            lockBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M12 17c1.1 0 2-.9
                    2-2s-.9-2-2-2-2 .9-2
                    2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7
                    3.24 7 6h1.9c0-1.71 1.39-3.1
                    3.1-3.1 1.71 0 3.1 1.39
                    3.1 3.1v2H6c-1.1 0-2 .9-2
                    2v10c0 1.1.9 2 2
                    2h12c1.1 0 2-.9
                    2-2V10c0-1.1-.9-2-2-2zm0
                    12H6V10h12v10z"/>
                </svg>
            `;

            gridCards.forEach(card => {
                delete card.dataset.gridLocked;

                const rh = card.querySelector('.resize-handle');
                const oh = card.querySelector('.rotate-handle');
                if (rh) rh.style.display = '';
                if (oh) oh.style.display = '';

                card.style.cursor = 'move';
            });
        }
    }

    // ------------------------------
    // Sliding behavior (Real-time reordering)
    // ------------------------------
    document.addEventListener('mousedown', e => {
        if (!isGridLocked) return;

        const card = e.target.closest('.photo-card');
        if (!card || !card.dataset.gridLocked) return;

        isSliding = true;
        slideCard = card;
        slideIndex = gridCards.indexOf(card);

        const x = parseFloat(card.dataset.x);
        const y = parseFloat(card.dataset.y);

        slideOffsetX = e.clientX - x;
        slideOffsetY = e.clientY - y;

        card.style.cursor = 'grabbing';
        card.style.zIndex = 10000;
        card.style.opacity = '0.7';

        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isSliding || !slideCard) return;

        const x = e.clientX - slideOffsetX;
        const y = e.clientY - slideOffsetY;

        // Update position of the actively dragged card
        slideCard.dataset.x = x;
        slideCard.dataset.y = y;
        updateCardTransform(slideCard);

        let newTargetIndex = -1;

        // Find the index the sliding card is currently over
        gridCards.forEach((card, index) => {
            if (card === slideCard) return;

            const rect = card.getBoundingClientRect();
            // Check if mouse is near the center of the other card
            if (
                e.clientX >= rect.left + rect.width * 0.25 &&
                e.clientX <= rect.right - rect.width * 0.25 &&
                e.clientY >= rect.top + rect.height * 0.25 &&
                e.clientY <= rect.bottom - rect.height * 0.25
            ) {
                newTargetIndex = index;
            }
        });

        // Perform reorder in real-time if a target is found and it's a new position
        if (newTargetIndex !== -1 && newTargetIndex !== slideIndex) {
            
            // Re-sequence the array (removes old, inserts new)
            gridCards.splice(slideIndex, 1);
            gridCards.splice(newTargetIndex, 0, slideCard);
            
            // Update the slide index
            slideIndex = newTargetIndex;
            
            // Re-arrange the grid for the smooth sliding effect
            arrangeCardsInGrid(); 
        }
    });

    document.addEventListener('mouseup', () => {
        if (!isSliding || !slideCard) return;

        isSliding = false;

        slideCard.style.cursor = 'grab';
        slideCard.style.zIndex = '';
        slideCard.style.opacity = '1';

        gridCards.forEach(card => (card.style.opacity = '1'));

        // Snap the sliding card back into its new grid position
        arrangeCardsInGrid(); 

        slideCard = null;
        slideIndex = -1;
    });

    // ------------------------------
    // Initialize buttons & state (FIXED click handler)
    // ------------------------------
    window.addEventListener('load', () => {
        
        const gridBtn = document.querySelector('[title="Grid"]');
        if (gridBtn) gridBtn.onclick = snapToGrid;

        const lockBtn = document.querySelector('[title="Lock grid"]');
        if (lockBtn) {
            // FIX: Use an anonymous function to explicitly toggle state and update visuals/grid
            lockBtn.onclick = () => {
                isGridLocked = !isGridLocked; // Manually toggle state
                updateLockState(isGridLocked); // Run the logic based on the new state
            };
        }
        
        // Set initial state to UNLOCKED and update visuals
        isGridLocked = false;
        updateLockState(isGridLocked);
        
        // Initial grid arrangement for cards loaded on startup
        snapToGrid();
    });

    // ------------------------------
    // Expose functions for app.js
    // ------------------------------

    window.gridAPI = {
        addCardToGrid(card) {
            if (!isGridLocked) return;

            card.dataset.gridLocked = 'true';

            const rh = card.querySelector('.resize-handle');
            const oh = card.querySelector('.rotate-handle');
            if (rh) rh.style.display = 'none';
            if (oh) oh.style.display = 'none';

            gridCards.push(card);
            arrangeCardsInGrid();
        }
    };

})();
