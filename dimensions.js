/* =====================================================
   DIMENSIONS.JS
   Displays picture and frame dimensions on TWO lines
   ===================================================== */

(function() {
    let areDimensionsVisible = false;
    const PIXELS_PER_INCH = 96; // Standard screen DPI

    // Get current measurement unit from the toolbar
    function getCurrentUnit() {
        const unitSelect = document.getElementById("measurementUnit");
        return unitSelect ? unitSelect.value : "px";
    }

    // Convert pixels to the selected unit
    function convertToUnit(pixels, unit) {
        switch(unit) {
            case "in":
                return (pixels / PIXELS_PER_INCH).toFixed(2);
            case "mm":
                return (pixels / PIXELS_PER_INCH * 25.4).toFixed(2);
            case "px":
            default:
                return Math.round(pixels).toString();
        }
    }

    // Update dimensions text for a single card
    window.updateCardDimensionsText = function(card) {
        const dimLabel = card.querySelector(".photo-dimensions");
        if (!dimLabel) return;

        // Only update if dimensions are currently visible
        if (!areDimensionsVisible) return;

        const dims = window.getCardDimensions(card);
        if (!dims) return;

        const unit = getCurrentUnit();

        // Picture dimensions (actual image)
        const picW = convertToUnit(dims.picture.width, unit);
        const picH = convertToUnit(dims.picture.height, unit);

        // Frame dimensions (image + matte + frame border)
        const frameW = convertToUnit(dims.frame.width, unit);
        const frameH = convertToUnit(dims.frame.height, unit);

        // Two-line format:
        // Line 1: Picture dimensions
        // Line 2: Frame dimensions
        dimLabel.innerHTML = `${picW} ${unit} × ${picH} ${unit}<br>${frameW} ${unit} × ${frameH} ${unit}`;
    };

    // Toggle dimensions visibility for all cards
    function toggleDimensionsVisibility() {
        areDimensionsVisible = !areDimensionsVisible;
        const allCards = document.querySelectorAll(".photo-card");

        allCards.forEach(card => {
            const dimLabel = card.querySelector(".photo-dimensions");
            if (dimLabel) {
                if (areDimensionsVisible) {
                    dimLabel.style.display = "block";
                    window.updateCardDimensionsText(card);
                } else {
                    dimLabel.style.display = "none";
                }
            }
        });
    }

    // Update all visible dimensions when unit changes
    function updateAllDimensions() {
        if (!areDimensionsVisible) return;

        const allCards = document.querySelectorAll(".photo-card");
        allCards.forEach(card => {
            window.updateCardDimensionsText(card);
        });
    }

    // Initialize
    document.addEventListener("DOMContentLoaded", function() {
        // Hook up the dimensions toggle button
        const toggleBtn = document.getElementById("dimensionsToggleBtn");
        if (toggleBtn) {
            toggleBtn.addEventListener("click", toggleDimensionsVisibility);
        }

        // Update all dimensions when measurement unit changes
        const unitSelect = document.getElementById("measurementUnit");
        if (unitSelect) {
            unitSelect.addEventListener("change", updateAllDimensions);
        }
    });
})();
