// ==========================================================
// FRAME SYSTEM + WALL SCALING + REAL-TIME DIMENSIONS + WALL COLOR
// ==========================================================

(function() {

    // --------------------------
    // UI ELEMENTS
    // --------------------------
    const applyFrameBtn   = document.getElementById("applyFrameBtn");
    const wallWidthInput  = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput   = document.getElementById("wallUnit");
    const wallColorInput  = document.getElementById("wallColor");   // NEW
    const dimToggleBtn    = document.getElementById("dimensionsToggleBtn");
    const wall            = document.getElementById("wall");

    const UNIT_TO_IN = {
        in: 1,
        ft: 12,
        cm: 0.393701,
        m: 39.3701
    };

    const CAPTION_GAP_PX = 10;

    // --------------------------
    // FRAME SETTINGS
    // --------------------------
    function getFrameSettings() {
        return {
            frameColor: document.getElementById("frameColor")?.value || "#424242",
            frameThickness: parseInt(document.getElementById("frameThickness")?.value) || 20,
            matteThickness: parseInt(document.getElementById("matteThickness")?.value) || 50,
            unit: document.getElementById("measurementUnit")?.value || "px"
        };
    }

    // --------------------------
    // APPLY FRAME
    // --------------------------
    function applyFrame(card, settings) {
        const frame = card.querySelector(".photo-frame");
        if (!frame) return;

        const u = settings.unit;

        frame.style.padding     = `${settings.matteThickness}${u}`;
        frame.style.background  = "#fff";
        frame.style.boxShadow   = `0 0 0 ${settings.frameThickness}${u} ${settings.frameColor}`;
        frame.style.setProperty("--frame-thickness", `${settings.frameThickness}${u}`);

        const caption = card.querySelector(".photo-caption");

        if (caption) {
            if (u === "px") {
                frame.style.marginBottom = `${settings.frameThickness + CAPTION_GAP_PX}px`;
                caption.style.marginTop = "0";
            } else {
                frame.style.marginBottom = `${settings.frameThickness}${u}`;
                caption.style.marginTop = `${CAPTION_GAP_PX}px`;
            }
        }

        updateDimensions(card);
    }

    function handleApplyFrame() {
        const cards = window.getSelectedCards ? window.getSelectedCards() : [];
        const settings = getFrameSettings();

        cards.forEach(c => applyFrame(c, settings));
    }

    // --------------------------
    // UPDATE WALL SIZE + COLOR
    // --------------------------
    function updateWall() {
        if (!wall) return;

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

        // Apply wall background color (NEW)
        wall.style.backgroundColor = wallColorInput.value;

        // Convert to inches
        let W_in = W * UNIT_TO_IN[U];
        let H_in = H * UNIT_TO_IN[U];

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

        wall.style.width  = `${renderW}px`;
        wall.style.height = `${renderH}px`;

        // Update dimensions for all cards
        document.querySelectorAll(".photo-card").forEach(updateDimensions);
    }

    // --------------------------
    // DIMENSIONS TEXT FOR EACH CARD
    // --------------------------
    function updateDimensions(card) {
        if (!window.currentWallInches) return;

        const frame = card.querySelector(".photo-frame");
        const dim   = card.querySelector(".photo-dimensions");

        if (!frame || !dim) return;

        const rect = frame.getBoundingClientRect();

        const pxW = rect.width;
        const pxH = rect.height;

        const scaleX = window.currentWallInches.width  / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        const wIn = pxW * scaleX;
        const hIn = pxH * scaleY;

        dim.textContent = `${wIn.toFixed(2)} in × ${hIn.toFixed(2)} in`;
    }

    window.updateCardDimensionsText = updateDimensions;

    // --------------------------
    // TOGGLE DIMENSIONS PANEL
    // --------------------------
    function toggleDimensions() {
        document.querySelectorAll(".photo-dimensions").forEach(el => {
            el.style.display = (el.style.display === "none" ? "block" : "none");
        });
    }

    // --------------------------
    // EVENT BINDINGS
    // --------------------------
    if (applyFrameBtn) applyFrameBtn.addEventListener("click", handleApplyFrame);
    if (dimToggleBtn)  dimToggleBtn.addEventListener("click", toggleDimensions);

    [wallWidthInput, wallHeightInput].forEach(el => {
        if (el) el.addEventListener("input", updateWall);
    });

    if (wallUnitInput) wallUnitInput.addEventListener("change", updateWall);

    // NEW: live-update wall color
    if (wallColorInput) wallColorInput.addEventListener("input", updateWall);

    window.addEventListener("load", updateWall);
    window.addEventListener("resize", updateWall);

})();
