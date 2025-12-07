// ==========================
// FRAME LOGIC + WALL SYSTEM
// with matching physical scale
// ==========================

(function() {

    const applyFrameBtn   = document.getElementById('applyFrameBtn');

    // WALL INPUTS
    const wallWidthInput  = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput   = document.getElementById("wallUnit");

    const buildWallBtn    = document.getElementById("buildWallBtn");

    const contentArea     = document.querySelector(".content-area");

    // Make a wall canvas that appears when hammer is clicked
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

    // Conversion factors to inches for wall
    const WALL_UNIT_TO_IN = {
        "in": 1,
        "ft": 12,
        "cm": 0.393701,
        "m": 39.3701
    };

    // Conversion factors to inches for frame/matte
    const FRAME_UNIT_TO_IN = {
        "in": 1,
        "mm": 0.0393701,
        // px is handled specially (no conversion)
        "px": null
    };

    const CAPTION_GAP_PX = 10;

    // current wall scale (pixels per inch)
    let wallScalePxPerInch = 1;

    // ------------------------------
    // FRAME SETTINGS
    // ------------------------------
    function getFrameSettings() {
        return {
            frameColor: document.getElementById('frameColor')?.value || '#424242',
            frameThickness: parseFloat(document.getElementById('frameThickness')?.value) || 20,
            matteThickness: parseFloat(document.getElementById('matteThickness')?.value) || 50,
            unit: document.getElementById('measurementUnit')?.value || 'px',
        };
    }

    // Convert a thickness (frame/matte) to pixels, respecting wall scale
    function thicknessToPx(value, unit) {
        if (unit === 'px') {
            return value; // user explicitly wants screen pixels
        }
        const factorIn = FRAME_UNIT_TO_IN[unit] || 1;
        const inches   = value * factorIn;
        return inches * wallScalePxPerInch;
    }

    // ------------------------------
    // APPLY FRAME TO CARD
    // ------------------------------
    function applyFrameToCard(card, settings) {
        const photoFrame = card.querySelector('.photo-frame');
        if (!photoFrame) return;

        // get pixel sizes using current wall scale
        const framePx = thicknessToPx(settings.frameThickness, settings.unit);
        const mattePx = thicknessToPx(settings.matteThickness, settings.unit);

        // Matte (inner padding)
        photoFrame.style.padding = `${mattePx}px`;
        photoFrame.style.backgroundColor = '#FFFFFF';

        // Frame border via box-shadow
        const frameShadowFinal = `0 0 0 ${framePx}px ${settings.frameColor}`;
        photoFrame.style.boxShadow = frameShadowFinal;

        // For blue outline offset
        photoFrame.style.setProperty('--frame-thickness', `${framePx}px`);

        // Caption spacing (frame thickness + fixed gap)
        photoFrame.style.marginBottom = `${framePx + CAPTION_GAP_PX}px`;
        const caption = card.querySelector('.photo-caption');
        if (caption) caption.style.marginTop = '0';

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

        if (!wallWidthInput || !wallHeightInput || !wallUnitInput) return;

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H || !WALL_UNIT_TO_IN[U]) {
            console.warn("Invalid wall dimensions");
            return;
        }

        // Convert to inches
        let W_in = W * WALL_UNIT_TO_IN[U];
        let H_in = H * WALL_UNIT_TO_IN[U];

        let wallRatio = W_in / H_in;

        // Available browser space (biggest possible wall)
        const screenW = window.innerWidth  - 80;  // margins
        const screenH = window.innerHeight - 160; // header space

        const screenRatio = screenW / screenH;

        let renderW, renderH;

        if (wallRatio > screenRatio) {
            renderW = screenW;
            renderH = screenW / wallRatio;
        } else {
            renderH = screenH;
            renderW = screenH * wallRatio;
        }

        // APPLY wall box dimensions
        wallCanvas.style.width  = `${renderW}px`;
        wallCanvas.style.height = `${renderH}px`;
        wallCanvas.style.display = "block";

        // update global scale (pixels per inch)
        wallScalePxPerInch = renderW / W_in;
        // (renderH / H_in would be equivalent)

        console.log("Wall built:", {
            wallPhysical: { W_in, H_in },
            renderPixels: { renderW, renderH },
            scalePxPerInch: wallScalePxPerInch
        });
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
        // optional: build a default wall once on load
        // buildWallBox();
    });

})();
