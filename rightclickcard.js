// ===============================
// RIGHT CLICK MENU FOR PHOTO CARDS
// ===============================

(function() {

    const menu = document.getElementById("photoContextMenu");
    let targetCard = null;

    // Prevent browser default right click
    document.addEventListener("contextmenu", e => {
        const card = e.target.closest(".photo-card");
        if (!card) return;

        e.preventDefault();
        targetCard = card;

        // Position menu
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.style.display = "block";
    });

    // Hide menu when clicking anywhere else
    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    // Handle clicks inside menu
    menu.addEventListener("click", e => {
        if (!targetCard) return;
        menu.style.display = "none";

        const action = e.target.dataset.action;
        if (!action) return;

        switch (action) {

            // ------------------------------
            // DELETE CARD
            // ------------------------------
            case "delete":
                targetCard.remove();
                break;

            // ------------------------------
            // REMOVE FRAME ONLY
            // ------------------------------
            case "remove-frame":
                const frame = targetCard.querySelector(".photo-frame");
                if (frame) {
                    frame.style.boxShadow = "none";
                    frame.style.padding = "0";
                    frame.style.background = "transparent";
                    frame.style.setProperty("--frame-thickness", "0px");
                }
                break;

            // ------------------------------
            // DUPLICATE CARD
            // ------------------------------
            case "duplicate":
                const clone = targetCard.cloneNode(true);

                // Offset so it doesn't overlap exactly
                const x = parseFloat(targetCard.dataset.x) || 0;
                const y = parseFloat(targetCard.dataset.y) || 0;
                clone.dataset.x = x + 30;
                clone.dataset.y = y + 30;

                // Apply transform
                clone.style.transform = `translate(${x + 30}px, ${y + 30}px) rotate(${clone.dataset.rotation || 0}deg)`;

                // Append to container
                document.getElementById("photo-container").appendChild(clone);
                break;
        }

        targetCard = null;
    });

})();

