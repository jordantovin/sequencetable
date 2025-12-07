// ==========================
// GRID SNAP / GRID LOCK SYSTEM
// ==========================

(function() {

    let isGridLocked = false;
    let gridCards = [];
    let slideCard = null;
    let slideIndex = -1;
    let swapTargetIndex = -1;
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
    function arrangeCardsInGrid() {
        const containerWidth = window.innerWidth;
        const spacing = 20;
        const startX = 50;

        let x = startX;
        let y = 150;
        let rowHeight = 0;

        gridCards.forEach(card => {
            const img = card.querySelector('img');

            const w = img.offsetWidth || 300;
            const h = img.offsetHeight || 400;

            // Wrap to next row
            if (x + w > containerWidth - 50 && x > startX) {
                y += rowHeight + spacing;
                x = startX;
                rowHeight = 0;
            }

            card.dataset.x = x;
            card.dataset.y = y;
            card.dataset.rotation = 0;

            updateCardTransform(card);

            x += w + spacing;
            rowHeight = Math.max(rowHeight, h);
        });
    }

    // ------------------------------
    // Toggle Grid Lock
    // ------------------------------
    function toggleGridLock() {
        isGridLocked = !isGridLocked;

        const lockBtn = document.querySelector('[title="Lock grid"]');
        const contentArea = document.querySelector('.content-area');
        contentArea.style.overflow = 'auto';

        if (isGridLocked) {
            // SNAP INTO PLACE
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

            // Lock all cards
            gridCards.forEach(card => {
                card.dataset.gridLocked = 'true';

                const rh = card.querySelector('.resize-handle');
                const oh = card.querySelector('.rotate-handle');
                if (rh) rh.style.display = 'none';
                if (oh) oh.style.display = 'none';

                card.style.cursor = 'grab';
            });

        } else {
            // UNLOCK
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
    // Sliding behavior
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

        slideCard.dataset.x = x;
        slideCard.dataset.y = y;

        updateCardTransform(slideCard);

        swapTargetIndex = -1;

        gridCards.forEach((card, index) => {
            if (card === slideCard) return;

            const rect = card.getBoundingClientRect();
            if (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            ) {
                swapTargetIndex = index;
                card.style.opacity = '0.5';
            } else {
                card.style.opacity = '1';
            }
        });
    });

    document.addEventListener('mouseup', () => {
        if (!isSliding || !slideCard) return;

        isSliding = false;

        slideCard.style.cursor = 'grab';
        slideCard.style.zIndex = '';
        slideCard.style.opacity = '1';

        gridCards.forEach(card => (card.style.opacity = '1'));

        if (swapTargetIndex !== -1 && swapTargetIndex !== slideIndex) {
            const temp = gridCards[slideIndex];
            gridCards[slideIndex] = gridCards[swapTargetIndex];
            gridCards[swapTargetIndex] = temp;
        }

        arrangeCardsInGrid();

        slideCard = null;
        slideIndex = -1;
        swapTargetIndex = -1;
    });

    // ------------------------------
    // Initialize buttons
    // ------------------------------
    window.addEventListener('load', () => {
        const gridBtn = document.querySelector('[title="Grid"]');
        if (gridBtn) gridBtn.onclick = snapToGrid;

        const lockBtn = document.querySelector('[title="Lock grid"]');
        if (lockBtn) {
            lockBtn.onclick = toggleGridLock;
        }
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
