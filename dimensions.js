// ==========================
// FRAME APPLICATION LOGIC (Final Version with Fixed Gap + Outline Fix)
// + WALL SIZE & RATIO SYSTEM (grid.js–safe)
// ==========================

(function() {
    
    const applyFrameBtn = document.getElementById('applyFrameBtn');

    // WALL INPUTS
    const wallWidthInput = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput  = document.getElementById("wallUnit");

    const contentArea = document.querySelector(".content-area");

    // Conversion factors to inches
    const UNIT_TO_IN = {
        "in": 1,
        "ft": 12,
        "cm": 0.393701,
        "m": 39.3701
    };

    if (!applyFrameBtn) return;

    const CAPTION_GAP_PX = 10;

    // ------------------------------
    // FRAME SETTINGS
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
    // APPLY FRAME TO CARD
    // ------------------------------
    function applyFrameToCard(card, settings) {
        const photoFrame = card.querySelector('.photo-frame');
        if (!photoFrame) return;

        const frameUnit = settings.unit;

        // Matte
        photoFrame.style.padding = `${settings.matteThickness}${frameUnit}`;
        photoFrame.style.backgroundColor = '#FFFFFF';

        // Frame border
        const frameSpread = `${settings.frameThickness}${frameUnit}`;
        const frameShadowFinal = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        photoFrame.style.boxShadow = frameShadowFinal;

        // Make outline offset work
        photoFrame.style.setProperty('--frame-thickness', `${settings.frameThickness}${frameUnit}`);

        // Caption spacing
        if (frameUnit === 'px') {
            photoFrame.style.marginBottom = `${settings.frameThickness + CAPTION_GAP_PX}px`;
            const caption = card.querySelector('.photo-caption');
            if (caption) caption.style.marginTop = '0';
        } else {
            photoFrame.style.marginBottom = `${settings.frameThickness}${frameUnit}`;
            const caption = card.querySelector('.photo-caption');
            if (caption) caption.style.marginTop = `${CAPTION_GAP_PX}px`;
        }

        card.dataset.frameSettings = JSON.stringify(settings);
        photoFrame.classList.add('has-frame');
    }

    // ------------------------------
    // APPLY FRAME BUTTON
    // ------------------------------
    function handleApplyFrameClick() {
        const cardsToFrame = window.getSelectedCards ? window.getSelectedCards() : [];
        
        if (cardsToFrame.length === 0) {
            console.warn('No photo cards are currently selected.');
            return;
        }
        
        const settings = getFrameSettings();
        cardsToFrame.forEach(card => applyFrameToCard(card, settings));

        console.log(`Applied frame to ${cardsToFrame.length} selected card(s).`);
    }

    // ======================================================
    //                WALL SIZE + RATIO SYSTEM
    //     (Maintains perfect aspect ratio, no transforms)
    // ======================================================

    function updateWallDimensions() {
        if (!contentArea) return;

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

        // Convert to inches
        let W_in = W * UNIT_TO_IN[U];
        let H_in = H * UNIT_TO_IN[U];

        let wallRatio = W_in / H_in;

        // Available browser space
        const screenW = window.innerWidth - 80;  // 40px margin on each side
        const screenH = window.innerHeight - 160; // subtract header area

        const screenRatio = screenW / screenH;

        // Decide which dimension limits the layout
        let renderW, renderH;

        if (wallRatio > screenRatio) {
            // wall is wider than browser
            renderW = screenW;
            renderH = screenW / wallRatio;
        } else {
            // wall is taller than browser
            renderH = screenH;
            renderW = screenH * wallRatio;
        }

        // Apply new aspect ratio safely
        contentArea.style.width = `${renderW}px`;
        contentArea.style.height = `${renderH}px`;
        contentArea.style.margin = "auto";
        contentArea.style.left = "0";
        contentArea.style.right = "0";
    }

    // Live updates
    if (wallWidthInput && wallHeightInput && wallUnitInput) {
        wallWidthInput.addEventListener("input", updateWallDimensions);
        wallHeightInput.addEventListener("input", updateWallDimensions);
        wallUnitInput.addEventListener("change", updateWallDimensions);
    }

    // Run once on load
    window.addEventListener("load", () => {
        applyFrameBtn.addEventListener('click', handleApplyFrameClick);
        updateWallDimensions();
    });

})();
