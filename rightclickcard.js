// ===============================
// RIGHT CLICK MENU FOR PHOTO CARDS
// ===============================

window.addEventListener("load", function() {

    const menu = document.getElementById("photoContextMenu");
    let targetCard = null;

    if (!menu) {
        console.error("❌ photoContextMenu element not found. Add it to your HTML.");
        return;
    }

    // -------------------------------------------
    // RIGHT CLICK ON PHOTO CARD
    // -------------------------------------------
    document.addEventListener("contextmenu", e => {

        const card = e.target.closest(".photo-card");
        if (!card) return; // let normal right-click happen for everything else

        e.preventDefault();
        targetCard = card;

        // Position the menu
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.style.display = "block";
    });

    // -------------------------------------------
    // CLICK ANYWHERE → HIDE MENU
    // -------------------------------------------
    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    // -------------------------------------------
    // CLICK INSIDE CONTEXT MENU
    // -------------------------------------------
    menu.addEventListener("click", e => {

        if (!targetCard) return;
        menu.style.display = "none";

        const action = e.target.dataset.action;
        if (!action) return;

        switch (action) {

            // --------------------------------------------------
            // DELETE CARD
            // --------------------------------------------------
            case "delete":
                targetCard.remove();
                break;

            // --------------------------------------------------
            // REMOVE FRAME ONLY
            // --------------------------------------------------
            case "remove-frame":
                const frame = targetCard.querySelector(".photo-frame");
                if (frame) {
                    frame.style.boxShadow = "none";
                    frame.style.padding = "0";
                    frame.style.background = "transparent";
                    frame.style.setProperty("--frame-thickness", "0px");
                }
                break;

            // --------------------------------------------------
            // DUPLICATE CARD — FULL FUNCTIONALITY CLONE
            // --------------------------------------------------
            case "duplicate":

                const clone = targetCard.cloneNode(true);

                // Position offset so the duplicate is visible
                const x = parseFloat(targetCard.dataset.x) || 0;
                const y = parseFloat(targetCard.dataset.y) || 0;

                clone.dataset.x = x + 30;
                clone.dataset.y = y + 30;

                const rotation = clone.dataset.rotation || "0";
                clone.style.transform = `translate(${x + 30}px, ${y + 30}px) rotate(${rotation}deg)`;

                const container = document.getElementById("photo-container");
                container.appendChild(clone);

                // ⭐ Reinitialize full card functionality if available
                if (window.initializePhotoCard) {
                    window.initializePhotoCard(clone);
                } else {
                    console.warn("⚠️ No initializePhotoCard() found. Duplicate will not have full functionality.");
                }

                break;
        }

        targetCard = null;
    });

});
