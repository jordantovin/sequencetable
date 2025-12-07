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
    const wallColorInput  = document.getElementById("wallColor");

    const dimToggleBtn    = document.getElementById("dimensionsToggleBtn");

    const buildWallBtn    = document.getElementById("buildWallBtn"); // <-- NEW
    const contentArea     = document.querySelector(".content-area");
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
        const cards = window.getSelectedCards ? window.getSelectedCards() : [];
        const settings = getFrameSettings();

        cards.forEach(c => applyFrame(c, settings));
    }

    // --------------------------
    // UPDATE WALL SIZE
    // --------------------------
    function updateWall() {
        if (!wall || wall.style.display === "none") return;

        let W = parseFloat(wallWidthInput.value);
        let H = parseFloat(wallHeightInput.value);
        let U = wallUnitInput.value;

        if (!W || !H) return;

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

        wall.style.width = `${renderW}px`;
        wall.style.height = `${renderH}px`;
        wall.style.backgroundColor = wallColorInput.value;

        document.querySelectorAll(".photo-card").forEach(updateDimensions);
    }

    // --------------------------
    // WALL COLOR UPDATE
    // --------------------------
    function updateWallColor() {
        if (!wall) return;
        wall.style.backgroundColor = wallColorInput.value;
    }

    // --------------------------
    // UPDATE PHOTO DIMENSIONS
    // --------------------------
    function updateDimensions(card) {
        if (!window.currentWallInches) return;

        const frame = card.querySelector(".photo-frame");
        const dim = card.querySelector(".photo-dimensions");

        if (!frame || !dim) return;

        const rect = frame.getBoundingClientRect();

        const scaleX = window.currentWallInches.width / wall.offsetWidth;
        const scaleY = window.currentWallInches.height / wall.offsetHeight;

        const wIn = rect.width * scaleX;
        const hIn = rect.height * scaleY;

        dim.textContent = `${wIn.toFixed(2)} in × ${hIn.toFixed(2)} in`;
    }

    window.updateCardDimensionsText = updateDimensions;

    // --------------------------
    // TOGGLE DIMENSION LABELS
    // --------------------------
    function toggleDimensions() {
        document.querySelectorAll(".photo-dimensions").forEach(el => {
            el.style.display = el.style.display === "none" ? "block" : "none";
        });
    }

    // --------------------------
    // EVENT LISTENERS
    // --------------------------
    if (applyFrameBtn) applyFrameBtn.addEventListener("click", handleApplyFrame);
    if (dimToggleBtn) dimToggleBtn.addEventListener("click", toggleDimensions);

    if (wallColorInput) wallColorInput.addEventListener("input", updateWallColor);

    [wallWidthInput, wallHeightInput].forEach(el => {
        if (el) el.addEventListener("input", updateWall);
    });

    if (wallUnitInput) wallUnitInput.addEventListener("change", updateWall);

    // --------------------------
    // HAMMER BUTTON ACTIVATES THE WALL
    // --------------------------
    if (buildWallBtn) {
        buildWallBtn.addEventListener("click", () => {
            wall.style.display = "block";  // <-- makes wall appear
            updateWall();                  // <-- size immediately
        });
    }

    window.addEventListener("resize", updateWall);

})();
