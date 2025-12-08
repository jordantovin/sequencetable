// ==========================================================
// FRAME SYSTEM + WALL SCALING + REAL-TIME DIMENSIONS + WALL COLOR
// Updated to show PICTURE and FRAME dimensions separately
// Picture dimensions are clickable (handled by photo-cards.js)
// ==========================================================

(function () {

    const applyFrameBtn   = document.getElementById("applyFrameBtn");

    const wallWidthInput  = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput   = document.getElementById("wallUnit");
    const wallColorInput  = document.getElementById("wallColor");

    const dimToggleBtn    = document.getElementById("dimensionsToggleBtn");
    const buildWallBtn    = document.getElementById("buildWallBtn");
    const eraseWallBtn    = document.getElementById("eraseWallBtn");

    const wall            = document.getElementById("wall");

    const UNIT_TO_IN = {
        in: 1,
        ft: 12,
        cm: 0.393701,
        m: 39.3701
    };

    const CAPTION_GAP_PX = 10;

    /* ==========================================================
       FRAME SETTINGS
       ========================================================== */
    function getFrameSettings() {
        return {
            frameColor: document.getElementById("frameColor").value,
            frameThickness: parseInt(document.getElementById("frameThickness").value),
            matteThickness: parseInt(document.getElementById("matteThickness").value),
            unit: document.getElementById("measurementUnit").value
        };
    }

    /* ==========================================================
       APPLY FRAME
       ========================================================== */
    function applyFrame(card, settings) {
        const frame = card.querySelector(".photo-frame");
        if (!frame) return;

        const u = settings.unit;
        
        // Convert frame/matte measurements to pixels based on wall scale
        let frameThicknessPx = settings.frameThickness;
        let matteThicknessPx = settings.matteThickness;
        
        if (u === "in" && window.currentWallInches && wall) {
            // Convert inches to pixels using wall scale
            const pixelsPerInch = wall.offsetWidth / window.currentWallInches.width;
            frameThicknessPx = settings.frameThickness * pixelsPerInch;
            matteThicknessPx = settings.matteThickness * pixelsPerInch;
        } else if (u === "mm" && window.currentWallInches && wall) {
            // Convert mm to inches, then to pixels
            const pixelsPerInch = wall.offsetWidth / window.currentWallInches.width;
            frameThicknessPx = (settings.frameThickness / 25.4) * pixelsPerInch;
            matteThicknessPx = (settings.matteThickness / 25.4) * pixelsPerInch;
        }
        // If px, use as-is

        frame.style.padding = `${matteThicknessPx}px`;
        frame.style.background = "#fff";
        frame.style.boxShadow = `0 0 0 ${frameThicknessPx}px ${settings.frameColor}`;
        frame.style.setProperty("--frame-thickness", `${frameThicknessPx}px`);

        const caption = card.querySelector(".photo-caption");

        if (caption) {
            frame.style.marginBottom = `${frameThicknessPx + CAPTION_GAP_PX}px`;
            caption.style.marginTop = "0";
        }

        updateDimensions(card);
    }

    function handleApplyFrame() {
        const cards = window.getSelectedCards();
        const settings = getFrameSettings();
        cards.forEach(c => applyFrame(c, settings));
    }

    /* ==========================================================
       UPDATE WALL (ALWAYS ACTIVE)
       ========================================================== */
    function updateWall() {
        if (!wall) return;

        wall.style.display = "block";

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

        const W_in = W * UNIT_TO_IN[U];
        const H_in = H * UNIT_TO_IN[U];

        window.currentWallInches = { width: W_in, height: H_in };

        const wallRatio = W_in / H_in;
        const screenW = window.innerWidth - 80;
        const screenH = window.innerHeight - 160;
        const screenRatio = screenW / screenH;

        let renderW, renderH;

        if (wallRatio > screenRatio) {
            renderW = screenW;
            renderH = renderW / wallRatio;
        } else {
            renderH = screenH;
            renderW = renderH * wallRatio;
        }

        wall.style.width = `${renderW}px`;
        wall.style.height = `${renderH}px`;

        wall.style.backgroundColor = wallColorInput.value;

        document.querySelectorAll(".photo-card").forEach(updateDimensions);
    }

    /* ==========================================================
       UPDATE WALL COLOR
       ========================================================== */
    function updateWallColor() {
        wall.style.background = wallColorInput.value;
    }

    /* ==========================================================
       UPDATE DIMENSIONS FOR EACH CARD
       Updates the two separate spans:
       - .picture-dimensions: Picture dimensions (clickable, handled by photo-cards.js)
       - .frame-dimensions: Frame dimensions (read-only)
       ========================================================== */
    function updateDimensions(card) {
        if (!window.currentWallInches) return;

        const label = card.querySelector(".photo-dimensions");
        if (!label) return;

        // Get the img and frame elements directly
        const img = card.querySelector("img");
        const frame = card.querySelector(".photo-frame");
        
        if (!img || !frame) return;

        const scaleX = window.currentWallInches.width / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        // Picture dimensions (actual image only - the photo itself)
        const picWIn = img.offsetWidth * scaleX;
        const picHIn = img.offsetHeight * scaleY;

        // Frame dimensions (image + matte + frame border)
        // Note: box-shadow doesn't affect offsetWidth, so we need to add frame thickness manually
        let frameBorderPx = 0;
        const frameThicknessVar = frame.style.getPropertyValue('--frame-thickness');
        if (frameThicknessVar) {
            // Parse the frame thickness (could be "20px" or "20in", etc.)
            const match = frameThicknessVar.match(/^(\d+(?:\.\d+)?)(px|in|mm)$/);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2];
                
                // Convert to pixels if needed
                if (unit === 'px') {
                    frameBorderPx = value;
                } else if (unit === 'in') {
                    frameBorderPx = value * 96; // 96 pixels per inch
                } else if (unit === 'mm') {
                    frameBorderPx = value * 96 / 25.4; // mm to inches to pixels
                }
            }
        }
        
        // Total frame size includes the border on both sides (2x)
        const totalFrameWidth = frame.offsetWidth + (frameBorderPx * 2);
        const totalFrameHeight = frame.offsetHeight + (frameBorderPx * 2);
        
        const frameWIn = totalFrameWidth * scaleX;
        const frameHIn = totalFrameHeight * scaleY;

        // Check for the new span structure from photo-cards.js
        const pictureDimSpan = label.querySelector('.picture-dimensions');
        const frameDimSpan = label.querySelector('.frame-dimensions');

        if (pictureDimSpan && frameDimSpan) {
            // New structure: update the separate clickable spans
            pictureDimSpan.textContent = `📷 ${picWIn.toFixed(2)}" × ${picHIn.toFixed(2)}"`;
            frameDimSpan.textContent = `🖼️ ${frameWIn.toFixed(2)}" × ${frameHIn.toFixed(2)}"`;
        } else {
            // Legacy fallback: use innerHTML
            label.innerHTML = `${picWIn.toFixed(2)} in × ${picHIn.toFixed(2)} in<br>${frameWIn.toFixed(2)} in × ${frameHIn.toFixed(2)} in`;
        }
    }

    window.updateCardDimensionsText = updateDimensions;

    /* ==========================================================
       TOGGLE DIMENSION LABELS
       ========================================================== */
    function toggleDimensions() {
        document.querySelectorAll(".photo-dimensions").forEach(el => {
            el.style.display = el.style.display === "none" ? "block" : "none";
        });
    }

    /* ==========================================================
       EVENT LISTENERS
       ========================================================== */
    applyFrameBtn.addEventListener("click", handleApplyFrame);
    dimToggleBtn.addEventListener("click", toggleDimensions);

    wallColorInput.addEventListener("input", updateWallColor);

    wallWidthInput.addEventListener("input", updateWall);
    wallHeightInput.addEventListener("input", updateWall);
    wallUnitInput.addEventListener("change", updateWall);

    buildWallBtn.addEventListener("click", () => {
        // Show the wall
        wall.style.display = "block";
        updateWall();
        
        // Show the erase button, hide the build button
        buildWallBtn.style.display = "none";
        eraseWallBtn.style.display = "flex";
    });

    eraseWallBtn.addEventListener("click", () => {
        // Hide the wall
        wall.style.display = "none";
        
        // Show the build button, hide the erase button
        buildWallBtn.style.display = "flex";
        eraseWallBtn.style.display = "none";
    });

    window.addEventListener("resize", updateWall);
    // Wall is hidden by default - only shown when hammer button is clicked

})();
