// ==========================================================
// DIMENSIONS + FRAME SYSTEM + WALL SIZE SCALING
// With Real-Time Dimension Updates & Toggle Visibility
// ==========================================================

(function() {

    // ------------------------------------------------------
    // ELEMENT HOOKS
    // ------------------------------------------------------
    const applyFrameBtn = document.getElementById("applyFrameBtn");

    // Wall UI
    const wallWidthInput  = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput   = document.getElementById("wallUnit");

    const contentArea = document.querySelector(".content-area");

    // Dimensions toggle button (from toolbar)
    const dimToggleBtn = document.querySelector(".toolbar-icon[title='Dimensions']");

    // Conversion dictionary to inches
    const UNIT_TO_IN = {
        "in": 1,
        "ft": 12,
        "cm": 0.393701,
        "m": 39.3701
    };

    const CAPTION_GAP_PX = 10;

    // ------------------------------------------------------
    // FRAME SETTINGS
    // ------------------------------------------------------
    function getFrameSettings() {
        return {
            frameColor: document.getElementById("frameColor")?.value || "#424242",
            frameThickness: parseInt(document.getElementById("frameThickness")?.value) || 20,
            matteThickness: parseInt(document.getElementById("matteThickness")?.value) || 50,
            unit: document.getElementById("measurementUnit")?.value || "px"
        };
    }

    // ------------------------------------------------------
    // APPLY FRAME TO PHOTO CARD
    // ------------------------------------------------------
    function applyFrameToCard(card, settings) {
        const photoFrame = card.querySelector(".photo-frame");
        if (!photoFrame) return;

        const frameUnit = settings.unit;

        // Matte
        photoFrame.style.padding = `${settings.matteThickness}${frameUnit}`;
        photoFrame.style.backgroundColor = "#FFFFFF";

        // Outer frame (box-shadow used as frame thickness)
        const frameShadow = `0 0 0 ${settings.frameThickness}${frameUnit} ${settings.frameColor}`;
        photoFrame.style.boxShadow = frameShadow;

        // Pass frame thickness to CSS so outlines offset correctly
        photoFrame.style.setProperty("--frame-thickness", `${settings.frameThickness}${frameUnit}`);

        // Caption spacing
        const caption = card.querySelector(".photo-caption");
        if (caption) {
            if (frameUnit === "px") {
                photoFrame.style.marginBottom = `${settings.frameThickness + CAPTION_GAP_PX}px`;
                caption.style.marginTop = "0";
            } else {
                photoFrame.style.marginBottom = `${settings.frameThickness}${frameUnit}`;
                caption.style.marginTop = `${CAPTION_GAP_PX}px`;
            }
        }

        card.dataset.frameSettings = JSON.stringify(settings);
        photoFrame.classList.add("has-frame");

        updateCardDimensionsText(card);
    }

    // ------------------------------------------------------
    // FRAME APPLY BUTTON
    // ------------------------------------------------------
    function handleApplyFrameClick() {
        const cards = window.getSelectedCards ? window.getSelectedCards() : [];

        if (cards.length === 0) {
            console.warn("No cards selected.");
            return;
        }

        const settings = getFrameSettings();

        cards.forEach(card => applyFrameToCard(card, settings));
    }

    // ------------------------------------------------------
    // WALL SCALING SYSTEM
    // ------------------------------------------------------
    function updateWallDimensions() {
        if (!contentArea) return;

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

        // Convert to inches
        let W_in = W * UNIT_TO_IN[U];
        let H_in = H * UNIT_TO_IN[U];

        const wallRatio = W_in / H_in;

        // Available browser area
        const screenW = window.innerWidth - 80;  
        const screenH = window.innerHeight - 160; 

        const screenRatio = screenW / screenH;

        let renderW, renderH;

        if (wallRatio > screenRatio) {
            renderW = screenW;
            renderH = screenW / wallRatio;
        } else {
            renderH = screenH;
            renderW = screenH * wallRatio;
        }

        // Apply
        contentArea.style.width = `${renderW}px`;
        contentArea.style.height = `${renderH}px`;
        contentArea.style.margin = "auto";

        // Update dimensions for all cards when the wall changes
        document.querySelectorAll(".photo-card").forEach(updateCardDimensionsText);

        window.currentWallInches = { width: W_in, height: H_in };
    }

    // ------------------------------------------------------
    // DIMENSION DISPLAY UNDER EACH PHOTO
    // ------------------------------------------------------
    function updateCardDimensionsText(card) {
        if (!window.currentWallInches) return;

        const frameContainer = card.querySelector(".photo-frame");
        if (!frameContainer) return;

        const rect = frameContainer.getBoundingClientRect();

        let pxW = rect.width;
        let pxH = rect.height;

        const scaleX = window.currentWallInches.width  / contentArea.clientWidth;
        const scaleY = window.currentWallInches.height / contentArea.clientHeight;

        const inW = pxW * scaleX;
        const inH = pxH * scaleY;

        const dimText = card.querySelector(".photo-dimensions");
        if (dimText) {
            dimText.textContent = `${inW.toFixed(2)} in × ${inH.toFixed(2)} in`;
        }
    }

    // Expose globally for resize.js/grid.js
    window.updateCardDimensionsText = updateCardDimensionsText;

    // ------------------------------------------------------
    // DIMENSIONS VISIBILITY TOGGLE
    // ------------------------------------------------------
    function toggleDimensions() {
        const allDims = document.querySelectorAll(".photo-dimensions");
        allDims.forEach(dim => {
            dim.style.display = dim.style.display === "none" ? "block" : "none";
        });
    }

    if (dimToggleBtn) {
        dimToggleBtn.addEventListener("click", toggleDimensions);
    }

    // ------------------------------------------------------
    // EVENT LISTENERS
    // ------------------------------------------------------
    if (applyFrameBtn) {
        applyFrameBtn.addEventListener("click", handleApplyFrameClick);
    }

    if (wallWidthInput && wallHeightInput && wallUnitInput) {
        wallWidthInput.addEventListener("input", updateWallDimensions);
        wallHeightInput.addEventListener("input", updateWallDimensions);
        wallUnitInput.addEventListener("change", updateWallDimensions);
    }

    window.addEventListener("load", updateWallDimensions);
    window.addEventListener("resize", updateWallDimensions);

})();
