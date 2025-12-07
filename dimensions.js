// ==========================
// FRAME APPLICATION LOGIC (Final Version with Fixed Gap)
// ==========================

(function() {
    
    const applyFrameBtn = document.getElementById('applyFrameBtn');
    
    if (!applyFrameBtn) return;

    // 💡 PATCH: Fixed desired gap between the outer edge of the frame and the caption text
    const CAPTION_GAP_PX = 10; 

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

        const frameUnit = settings.unit;
        
        // --- 1. Matte (Inner border next to image): Use PADDING ---
        // Padding size is the matte thickness
        photoFrame.style.padding = `${settings.matteThickness}${frameUnit}`;
        
        // Set the background color of the photoFrame to the matte color
        photoFrame.style.backgroundColor = '#FFFFFF'; // Assuming white matte
        
        // --- 2. Frame (Outer border): Use BOX-SHADOW ---
        // Shadow spread is the frame thickness, it starts outside the padding (matte)
        const frameSpread = `${settings.frameThickness}${frameUnit}`;
        const frameShadowFinal = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        photoFrame.style.boxShadow = frameShadowFinal;
        
        // --- 3. Caption Spacing Fix ---
        
        // We set the margin-bottom to the thickness of the frame (box-shadow) 
        // plus the fixed CAPTION_GAP_PX.
        
        if (frameUnit === 'px') {
             // If in pixels, use direct math to combine frame thickness and the fixed gap.
             photoFrame.style.marginBottom = `${settings.frameThickness + CAPTION_GAP_PX}px`;
             
             // Clear the caption's margin-top, as the entire gap is handled by photoFrame.marginBottom
             const caption = card.querySelector('.photo-caption');
             if (caption) {
                caption.style.marginTop = '0'; 
             }
        } else {
             // If not in pixels (e.g., 'in' or 'mm'), apply the frame thickness as margin 
             // and the fixed gap on the caption's margin-top as a safer fallback.
             
             photoFrame.style.marginBottom = `${settings.frameThickness}${frameUnit}`;
             
             const caption = card.querySelector('.photo-caption');
             if (caption) {
                caption.style.marginTop = `${CAPTION_GAP_PX}px`;
             }
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
