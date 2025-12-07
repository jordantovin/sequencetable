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

    // Fallback: define getSelectedCards if not already provided
    if (!window.getSelectedCards) {
        window.getSelectedCards = function() {
            return Array.from(document.querySelectorAll(".photo-card.selected"));
        };
    }

    // -----------------------------
    // Helper: attach basic behavior to a clone
    // (drag + click-to-select)
    // -----------------------------
    function attachCloneBehavior(card) {
        // Mark it as a clone so we know we manage its drag
        card.dataset.isClone = "1";

        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let cardStartX = 0;
        let cardStartY = 0;

        // Ensure dataset.x / y exist
        if (!card.dataset.x) card.dataset.x = "0";
        if (!card.dataset.y) card.dataset.y = "0";
        if (!card.dataset.rotation) card.dataset.rotation = "0";

        function updateTransform() {
            const x = parseFloat(card.dataset.x) || 0;
            const y = parseFloat(card.dataset.y) || 0;
            const rotation = parseFloat(card.dataset.rotation) || 0;
            card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
        }

        updateTransform();

        // Mouse down to start drag
        card.addEventListener("mousedown", (e) => {
            // Left button only and not on resize/rotate handles
            if (e.button !== 0) return;
            if (e.target.closest(".resize-handle") || e.target.closest(".rotate-handle")) {
                return;
            }

            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            cardStartX = parseFloat(card.dataset.x) || 0;
            cardStartY = parseFloat(card.dataset.y) || 0;

            // Also handle selection on click
            if (!e.shiftKey) {
                document.querySelectorAll(".photo-card.selected").forEach(c => {
                    if (c !== card) c.classList.remove("selected");
                });
            }
            card.classList.add("selected");

            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;

            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;

            card.dataset.x = cardStartX + dx;
            card.dataset.y = cardStartY + dy;
            updateTransform();
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
        });

        // Simple click selection (for cases where drag didn't start)
        card.addEventListener("click", (e) => {
            if (e.button !== 0) return;
            // Ignore if coming from context menu open
            if (e.detail === 0) return;

            if (!e.shiftKey) {
                document.querySelectorAll(".photo-card.selected").forEach(c => {
                    if (c !== card) c.classList.remove("selected");
                });
            }
            card.classList.add("selected");
        });
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
    // CONTEXT MENU OPTION HANDLING
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
            case "delete": {
                targetCard.remove();
                break;
            }

            // --------------------------------------------------
            // REMOVE FRAME ONLY
            // --------------------------------------------------
            case "remove-frame": {
                const frame = targetCard.querySelector(".photo-frame");
                if (frame) {
                    frame.style.boxShadow = "none";
                    frame.style.padding = "0";
                    frame.style.background = "transparent";
                    frame.style.setProperty("--frame-thickness", "0px");
                }
                break;
            }

            // --------------------------------------------------
            // DUPLICATE CARD — clone with full basic behavior
            // --------------------------------------------------
            case "duplicate": {
                const clone = targetCard.cloneNode(true);

                // Current position
                const x = parseFloat(targetCard.dataset.x) || 0;
                const y = parseFloat(targetCard.dataset.y) || 0;
                const rotation = targetCard.dataset.rotation || "0";

                // Offset so we can see it
                const newX = x + 30;
                const newY = y + 30;

                clone.dataset.x = newX;
                clone.dataset.y = newY;
                clone.dataset.rotation = rotation;

                clone.style.transform = `translate(${newX}px, ${newY}px) rotate(${rotation}deg)`;

                const container = document.getElementById("photo-container");
                container.appendChild(clone);

                // Attach our own drag + select behavior to the clone
                attachCloneBehavior(clone);

                break;
            }
        }

        targetCard = null;
    });

});
