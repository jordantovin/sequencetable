// Grid snap functionality
(function() {
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
        
        const containerWidth = window.innerWidth;
        const spacing = 20; // Gap between cards
        const startX = 50;
        let currentY = 150; // Starting Y position
        let currentX = startX;
        let rowHeight = 0; // Track tallest card in current row
        
        cardArray.forEach((card) => {
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
            
            // Position the card
            card.dataset.x = currentX;
            card.dataset.y = currentY;
            card.dataset.rotation = 0; // Reset rotation when snapping to grid
            
            updateCardTransform(card);
            
            // Update for next card
            currentX += cardWidth + spacing;
            rowHeight = Math.max(rowHeight, cardHeight);
        });
    }

    // Initialize grid button when page loads
    window.addEventListener('load', function() {
        const gridBtn = document.querySelector('[title="Grid"]');
        if (gridBtn) {
            gridBtn.onclick = function() {
                snapToGrid();
            };
        }
    });
})();
