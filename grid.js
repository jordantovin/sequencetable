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
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight - 120; // Account for header
        
        const cardCount = cards.length;
        if (cardCount === 0) return;
        
        // Calculate grid dimensions
        const cols = Math.ceil(Math.sqrt(cardCount));
        const rows = Math.ceil(cardCount / cols);
        
        const spacing = 40; // Gap between cards
        const startX = 50;
        const startY = 150;
        
        cards.forEach((card, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const img = card.querySelector('img');
            const cardWidth = img.offsetWidth || 300;
            const cardHeight = img.offsetHeight || 400;
            
            const x = startX + col * (cardWidth + spacing);
            const y = startY + row * (cardHeight + spacing);
            
            card.dataset.x = x;
            card.dataset.y = y;
            card.dataset.rotation = 0; // Reset rotation when snapping to grid
            
            updateCardTransform(card);
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
