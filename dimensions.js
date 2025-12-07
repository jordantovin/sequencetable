// =====================================================
// FRAME LOGIC + WALL SYSTEM + DIMENSIONS DISPLAY
// =====================================================

(function() {

    const applyFrameBtn = document.getElementById('applyFrameBtn');

    // WALL INPUTS
    const wallWidthInput  = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput   = document.getElementById("wallUnit");
    const buildWallBtn    = document.getElementById("buildWallBtn");

    // DIMENSIONS TOGGLE
    const dimensionsToggleBtn = document.getElementById("dimensionsToggleBtn");
    let showDimensions = false;

    const contentArea = document.querySelector(".content-area");

    // Create a wall canvas
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

    // Unit conversion (wall)
    const WALL_UNIT_TO_IN = {
        "in": 1,
        "ft": 12,
        "cm": 0.393701,
        "m": 39.3701
    };

    // Unit conversion for frame/matte
    const FRAME_UNIT_TO_IN = {
        "in": 1,
        "mm": 0.0393701,
        "px": null  // raw pixels
    };

    let wallScalePxPerInch = 1;
    const CAPTION_GAP_PX = 10;

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

    // Convert thickness to pixels using wall scale
    function thicknessToPx(value, unit) {
        if (unit === 'px') return value;
        const inches = value * (FRAME_UNIT_TO_IN[unit] || 1);
        return inches * wallScalePxPerInch;
    }

    // ------------------------------
    // APPLY FRAME TO CARD
    // ------------------------------
    function applyFrameToCard(card, settings) {
        const photoFrame = card.querySelector('.photo-frame');
        if (!photoFrame) return;

        const framePx = thicknessToPx(settings.frameThickness, settings.unit);
        const mattePx = thicknessToPx(settings.matteThickness, settings.unit);

        // Matte padding
        photoFrame.style.padding = `${mattePx}px`;
        photoFrame.style.background = "#fff";

        // Frame box-shadow
        photoFrame.style.boxShadow = `0 0 0 ${framePx}px ${settings.frameColor}`;
        photoFrame.style.setProperty('--frame-thickness', `${framePx}px`);

        // Caption spacing
        photoFrame.style.marginBottom = `${framePx + CAPTION_GAP_PX}px`;

        card.dataset.frameSettings = JSON.stringify(settings);
        photoFrame.classList.add("has-frame");

        updateCardDimensionsText(card); // UPDATE SIZE IF VISIBLE
    }

    function handleApplyFrameClick() {
        const cards = window.getSelectedCards ? window.getSelectedCards() : [];
        if (!cards.length) return;

        const settings = getFrameSettings();
        cards.forEach(c => applyFrameToCard(c, settings));
    }

    // ======================================================
    // BUILD WALL + RATIO
    // ======================================================
    function buildWallBox() {

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

        let W_in = W * WALL_UNIT_TO_IN[U];
        let H_in = H * WALL_UNIT_TO_IN[U];
        let ratio = W_in / H_in;

        const screenW = window.innerWidth - 80;
        const screenH = window.innerHeight - 160;

        const screenRatio = screenW / screenH;

        let renderW, renderH;
        if (ratio > screenRatio) {
            renderW = screenW;
            renderH = screenW / ratio;
        } else {
            renderH = screenH;
            renderW = screenH * ratio;
        }

        wallCanvas.style.width = `${renderW}px`;
        wallCanvas.style.height = `${renderH}px`;
        wallCanvas.style.display = "block";

        wallScalePxPerInch = renderW / W_in;

        // Update dimensions for every card
        document.querySelectorAll(".photo-card").forEach(updateCardDimensionsText);
    }

    // ======================================================
    // DIMENSIONS-UNDER-NAME SYSTEM
    // ======================================================

    function updateCardDimensionsText(card) {
        if (!showDimensions) {
            const dim = card.querySelector(".photo-dimensions");
            if (dim) dim.remove();
            return;
        }

        const img = card.querySelector("img");
        const frame = card.querySelector(".photo-frame");

        if (!img || !frame) return;

        // Physical size calculation
        const pixelW = img.naturalWidth;
        const pixelH = img.naturalHeight;

        // Convert px → inches using wall scale
        const physW_in = (frame.offsetWidth  / wallScalePxPerInch).toFixed(2);
        const physH_in = (frame.offsetHeight / wallScalePxPerInch).toFixed(2);

        let dim = card.querySelector(".photo-dimensions");
        if (!dim) {
            dim = document.createElement("div");
            dim.className = "photo-dimensions";
            dim.style.fontSize = "11px";
            dim.style.marginTop = "4px";
            dim.style.opacity = "0.7";
            dim.style.pointerEvents = "none";
            card.appendChild(dim);
        }

        dim.textContent = `${physW_in} × ${physH_in} in`;
    }

    // Toggle dimensions on/off
    if (dimensionsToggleBtn) {
        dimensionsToggleBtn.addEventListener("click", () => {
            showDimensions = !showDimensions;
            document.querySelectorAll(".photo-card")
                .forEach(updateCardDimensionsText);
        });
    }

    // ======================================================
    // INIT
    // ======================================================
    window.addEventListener("load", () => {
        if (applyFrameBtn) applyFrameBtn.addEventListener("click", handleApplyFrameClick);
        if (buildWallBtn) buildWallBtn.addEventListener("click", buildWallBox);
    });

})();
