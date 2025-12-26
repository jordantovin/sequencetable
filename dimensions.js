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
    
    // Track dimensions visibility state
    let areDimensionsVisible = false;

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
        const cards = window.getSelectedCards ? window.getSelectedCards() : [];
        if (cards.length === 0) {
            // If no cards selected, apply to all cards
            document.querySelectorAll(".photo-card").forEach(card => {
                applyFrame(card, getFrameSettings());
            });
        } else {
            const settings = getFrameSettings();
            cards.forEach(c => applyFrame(c, settings));
        }
    }

    /* ==========================================================
       UPDATE WALL (ALWAYS ACTIVE)
       ========================================================== */
    function updateWall() {
        if (!wall) return;

        // Only update if wall is visible
        if (wall.style.display === 'none') return;

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
        if (wall) {
            wall.style.backgroundColor = wallColorInput.value;
        }
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

        // Picture dimensions (actual image only - the photo itself) in INCHES
        const picWIn = img.offsetWidth * scaleX;
        const picHIn = img.offsetHeight * scaleY;

        // Frame dimensions (image + matte + frame border)
        // Note: box-shadow doesn't affect offsetWidth, so we need to add frame thickness manually
        let frameBorderPx = 0;
        const frameThicknessVar = frame.style.getPropertyValue('--frame-thickness');
        if (frameThicknessVar) {
            // Parse the frame thickness (could be "20px" or "20in", etc.)
            const match = frameThicknessVar.match(/^(\d+(?:\.\d+)?)(px|in|mm)?$/);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2] || 'px';
                
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

        // Get the current measurement unit from the dropdown
        const measurementUnitEl = document.getElementById("measurementUnit");
        const displayUnit = measurementUnitEl ? measurementUnitEl.value : "in";

        // Convert from inches to the display unit
        let picW, picH, frameW, frameH, unitLabel;
        
        if (displayUnit === "mm") {
            // Convert inches to mm (1 inch = 25.4 mm)
            picW = picWIn * 25.4;
            picH = picHIn * 25.4;
            frameW = frameWIn * 25.4;
            frameH = frameHIn * 25.4;
            unitLabel = "mm";
        } else {
            // Default to inches
            picW = picWIn;
            picH = picHIn;
            frameW = frameWIn;
            frameH = frameHIn;
            unitLabel = '"';
        }

        // Check for the new span structure from photo-cards.js
        const pictureDimSpan = label.querySelector('.picture-dimensions');
        const frameDimSpan = label.querySelector('.frame-dimensions');

        if (pictureDimSpan && frameDimSpan) {
            // Don't update if currently being edited (has input fields)
            if (!pictureDimSpan.querySelector('input')) {
                pictureDimSpan.textContent = `Photo ${picW.toFixed(2)}${unitLabel} × ${picH.toFixed(2)}${unitLabel}`;
            }
            frameDimSpan.textContent = `Framed ${frameW.toFixed(2)}${unitLabel} × ${frameH.toFixed(2)}${unitLabel}`;
        } else {
            // Legacy fallback: use innerHTML
            label.innerHTML = `Photo ${picW.toFixed(2)}${unitLabel} × ${picH.toFixed(2)}${unitLabel}<br>Framed ${frameW.toFixed(2)}${unitLabel} × ${frameH.toFixed(2)}${unitLabel}`;
        }
        
        // Apply current visibility state
        label.style.display = areDimensionsVisible ? "block" : "none";
    }

    window.updateCardDimensionsText = updateDimensions;

    /* ==========================================================
       TOGGLE DIMENSION LABELS - FIXED VERSION
       ========================================================== */
    function toggleDimensions() {
        areDimensionsVisible = !areDimensionsVisible;
        
        const newDisplay = areDimensionsVisible ? "block" : "none";
        
        document.querySelectorAll(".photo-dimensions").forEach(el => {
            el.style.display = newDisplay;
        });
        
        // Update button visual state
        if (dimToggleBtn) {
            if (areDimensionsVisible) {
                dimToggleBtn.classList.add('active');
            } else {
                dimToggleBtn.classList.remove('active');
            }
        }
        
        // Update all dimension values (whether showing or hiding)
        document.querySelectorAll(".photo-card").forEach(updateDimensions);
    }
    
    // Expose for other modules
    window.toggleDimensions = toggleDimensions;
    window.areDimensionsVisible = () => areDimensionsVisible;

    /* ==========================================================
       EVENT LISTENERS
       ========================================================== */
    if (applyFrameBtn) {
        applyFrameBtn.addEventListener("click", handleApplyFrame);
    }
    
    if (dimToggleBtn) {
        dimToggleBtn.addEventListener("click", toggleDimensions);
    }

    if (wallColorInput) {
        wallColorInput.addEventListener("input", updateWallColor);
    }

    if (wallWidthInput) {
        wallWidthInput.addEventListener("input", updateWall);
    }
    
    if (wallHeightInput) {
        wallHeightInput.addEventListener("input", updateWall);
    }
    
    if (wallUnitInput) {
        wallUnitInput.addEventListener("change", updateWall);
    }

    // Update all dimension labels when measurement unit changes
    const measurementUnitEl = document.getElementById("measurementUnit");
    if (measurementUnitEl) {
        measurementUnitEl.addEventListener("change", () => {
            document.querySelectorAll(".photo-card").forEach(updateDimensions);
        });
    }

    if (buildWallBtn) {
        buildWallBtn.addEventListener("click", () => {
            // Show the wall
            wall.style.display = "block";
            updateWall();
            
            // Show the erase button, hide the build button
            buildWallBtn.style.display = "none";
            eraseWallBtn.style.display = "flex";
        });
    }

    if (eraseWallBtn) {
        eraseWallBtn.addEventListener("click", () => {
            // Hide the wall
            wall.style.display = "none";
            
            // Show the build button, hide the erase button
            buildWallBtn.style.display = "flex";
            eraseWallBtn.style.display = "none";
        });
    }

    window.addEventListener("resize", updateWall);
    // Wall is hidden by default - only shown when hammer button is clicked

})();
