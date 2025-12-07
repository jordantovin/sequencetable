// ==========================================================
// FRAME SYSTEM + WALL SCALING + REAL-TIME DIMENSIONS + WALL COLOR
// Updated to show PICTURE and FRAME dimensions separately
// ==========================================================

(function () {

    const applyFrameBtn   = document.getElementById("applyFrameBtn");

    const wallWidthInput  = document.getElementById("wallWidth");
    const wallHeightInput = document.getElementById("wallHeight");
    const wallUnitInput   = document.getElementById("wallUnit");
    const wallColorInput  = document.getElementById("wallColor");

    const dimToggleBtn    = document.getElementById("dimensionsToggleBtn");
    const buildWallBtn    = document.getElementById("buildWallBtn");

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

        frame.style.padding = `${settings.matteThickness}${u}`;
        frame.style.background = "#fff";
        frame.style.boxShadow = `0 0 0 ${settings.frameThickness}${u} ${settings.frameColor}`;
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
       Now shows TWO lines: Picture dimensions + Frame dimensions
       ========================================================== */
    function updateDimensions(card) {
        if (!window.currentWallInches) return;

        const label = card.querySelector(".photo-dimensions");
        if (!label) return;

        // Get separate measurements for picture and frame
        const dims = window.getCardDimensions?.(card);
        if (!dims) return;

        const scaleX = window.currentWallInches.width / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        // Picture dimensions (actual image only)
        const picWIn = dims.picture.width * scaleX;
        const picHIn = dims.picture.height * scaleY;

        // Frame dimensions (image + matte + frame border)
        const frameWIn = dims.frame.width * scaleX;
        const frameHIn = dims.frame.height * scaleY;

        // Display as two lines
        label.innerHTML = `${picWIn.toFixed(2)} in × ${picHIn.toFixed(2)} in<br>${frameWIn.toFixed(2)} in × ${frameHIn.toFixed(2)} in`;
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
        wall.style.display = "block";
        updateWall();
    });

    window.addEventListener("resize", updateWall);
    window.addEventListener("load", updateWall);

})();
