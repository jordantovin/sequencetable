// ==========================
// FRAME APPLICATION LOGIC (Final Version with Fixed Gap + Outline Fix)
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
        photoFrame.style.padding = `${settings.matteThickness}${frameUnit}`;
        photoFrame.style.backgroundColor = '#FFFFFF'; // matte color
        
        // --- 2. Frame (Outer border): Use BOX-SHADOW ---
        const frameSpread = `${settings.frameThickness}${frameUnit}`;
        const frameShadowFinal = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        photoFrame.style.boxShadow = frameShadowFinal;

        // 💡 NEW: expose frame thickness so CSS outline can sit OUTSIDE the grey frame
        photoFrame.style.setProperty('--frame-thickness', `${settings.frameThickness}${frameUnit}`);
        
        // --- 3. Caption Spacing Fix ---
        if (frameUnit === 'px') {
            photoFrame.style.marginBottom = `${settings.frameThickness + CAPTION_GAP_PX}px`;
            const caption = card.querySelector('.photo-caption');
            if (caption) caption.style.marginTop = '0';
        } else {
            photoFrame.style.marginBottom = `${settings.frameThickness}${frameUnit}`;
            const caption = card.querySelector('.photo-caption');
            if (caption) caption.style.marginTop = `${CAPTION_GAP_PX}px`;
        }

        // Store settings for persistence
        card.dataset.frameSettings = JSON.stringify(settings);
        
        // Optional: class marker
        photoFrame.classList.add('has-frame');
    }

    // ------------------------------
    // Main Button Click Handler
    // ------------------------------
    function handleApplyFrameClick() {
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
