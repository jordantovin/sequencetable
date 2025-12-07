// ==========================
// FRAME APPLICATION LOGIC
// ==========================

(function() {
    
    const applyFrameBtn = document.getElementById('applyFrameBtn');
    
    if (!applyFrameBtn) return;

    // ------------------------------
    // Utility: Read Input Values
    // ------------------------------
    function getFrameSettings() {
        return {
            frameColor: document.getElementById('frameColor')?.value || '#424242',
            frameThickness: parseInt(document.getElementById('frameThickness')?.value) || 20,
            matteThickness: parseInt(document.getElementById('matteThickness')?.value) || 50,
            unit: document.getElementById('measurementUnit')?.value || 'px',
        };
    }
    
    // ------------------------------
    // Utility: Apply Frame CSS
    // ------------------------------
    function applyFrameToCard(card, settings) {
        const photoFrame = card.querySelector('.photo-frame');
        
        if (!photoFrame) return;

        // Construct the CSS box-shadow string using the selected unit
        const frameUnit = settings.unit;
        
        // 💡 PATCH: Calculate the total thickness to push the caption down
        const totalThickness = settings.matteThickness + settings.frameThickness;
        const totalBorder = `${totalThickness}${frameUnit}`; // e.g., '70px'

        // 1. Matte Shadow (inner inset shadow)
        const matteSpread = `${settings.matteThickness}${frameUnit}`;
        const matteShadow = `inset 0 0 0 ${matteSpread} ${'#FFFFFF'}`;
        
        // 2. Frame Shadow (outer border-like shadow)
        const frameSpread = `${settings.frameThickness}${frameUnit}`;
        const frameShadow = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        
        // Apply both shadows
        photoFrame.style.boxShadow = `${frameShadow}, ${matteShadow}`;
        
        // 💡 PATCH IMPLEMENTATION: Push the photographer name down 
        // by adding margin to the bottom of the frame element.
        photoFrame.style.marginBottom = totalBorder;

        // Add a small fixed spacing margin to the caption for separation
        const caption = card.querySelector('.photo-caption');
        if (caption) {
            caption.style.marginTop = '8px'; 
        }

        // Store data attributes on the card for persistence/resizing
        card.dataset.frameSettings = JSON.stringify(settings);
        
        // Optional: Add a class for visual targeting
        photoFrame.classList.add('has-frame');
    }

    // ------------------------------
    // Main Button Click Handler
    // ------------------------------
    function handleApplyFrameClick() {
        // Access the function exposed by photocards.js
        const cardsToFrame = window.getSelectedCards ? window.getSelectedCards() : [];
        
        if (cardsToFrame.length === 0) {
            console.warn('No photo cards are currently selected.');
            return;
        }
        
        const settings = getFrameSettings();
        
        cardsToFrame.forEach(card => {
            applyFrameToCard(card, settings);
        });

        console.log(`Applied frame to ${cardsToFrame.length} selected card(s).`);
    }

    // ------------------------------
    // Initialization
    // ------------------------------
    window.addEventListener('load', () => {
        applyFrameBtn.addEventListener('click', handleApplyFrameClick);
    });

})();
