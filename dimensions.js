// ==========================
// FRAME LOGIC + WALL SYSTEM
// ==========================

(function() {

    const applyFrameBtn = document.getElementById('applyFrameBtn');

    // WALL INPUTS
    const wallWidthInput = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput  = document.getElementById("wallUnit");

    const buildWallBtn = document.getElementById("buildWallBtn");

    const contentArea = document.querySelector(".content-area");

    // Create wall canvas (starts hidden)
    const wallCanvas = document.createElement("div");
    wallCanvas.id = "wallCanvas";
    wallCanvas.style.position = "absolute";
    wallCanvas.style.left = "50%";
    wallCanvas.style.top = "50%";
    wallCanvas.style.transform = "translate(-50%, -50%)";
    wallCanvas.style.background = "#f1f1f1";
    wallCanvas.style.border = "2px solid #000";
    wallCanvas.style.display = "none";
    wallCanvas.style.zIndex = "0";
    contentArea.appendChild(wallCanvas);

    // Conversion factors to inches
    const UNIT_TO_IN = {
        "in": 1,
        "ft": 12,
        "cm": 0.393701,
        "m": 39.3701
    };

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
    // ======================================================

    function buildWallBox() {

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

        // Convert to inches
        let W_in = W * UNIT_TO_IN[U];
        let H_in = H * UNIT_TO_IN[U];

        let wallRatio = W_in / H_in;

        // Available browser space (biggest possible wall)
        const screenW = window.innerWidth - 80;
        const screenH = window.innerHeight - 160;

        const screenRatio = screenW / screenH;

        // Decide rendering scale
        let renderW, renderH;

        if (wallRatio > screenRatio) {
            renderW = screenW;
            renderH = screenW / wallRatio;
        } else {
            renderH = screenH;
            renderW = screenH * wallRatio;
        }

        // APPLY wall box dimensions
        wallCanvas.style.width = `${renderW}px`;
        wallCanvas.style.height = `${renderH}px`;
        wallCanvas.style.display = "block";

        console.log("Wall built:", renderW, renderH);
    }

    // ------------------------------
    // BUILD WALL BUTTON (HAMMER)
    // ------------------------------
    if (buildWallBtn) {
        buildWallBtn.addEventListener("click", buildWallBox);
    }

    // ------------------------------
    // INIT
    // ------------------------------
    window.addEventListener("load", () => {
        if (applyFrameBtn) {
            applyFrameBtn.addEventListener('click', handleApplyFrameClick);
        }
    });

})();
