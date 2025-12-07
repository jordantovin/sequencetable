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
    // UNIVERSAL SELECTION LOGIC
    // (same logic originals use)
// -------------------------------------------
    function selectCard(card, additive = false) {
        if (!additive) {
            document.querySelectorAll(".photo-card.selected").forEach(c => c.classList.remove("selected"));
        }
        card.classList.add("selected");
    }

    // Make system-wide selection discoverable
    window.getSelectedCards = function() {
        return Array.from(document.querySelectorAll(".photo-card.selected"));
    };

    // -------------------------------------------
    // BASIC DRAG + SELECT BEHAVIOR FOR CLONES
    // -------------------------------------------
    function attachCloneBehavior(card) {

        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let cardStartX = 0;
        let cardStartY = 0;

        if (!card.dataset.x) card.dataset.x = "0";
        if (!card.dataset.y) card.dataset.y = "0";
        if (!card.dataset.rotation) card.dataset.rotation = "0";

        function updateTransform() {
            const x = parseFloat(card.dataset.x);
            const y = parseFloat(card.dataset.y);
            const rot = parseFloat(card.dataset.rotation);
            card.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
        }

        updateTransform();

        card.addEventListener("mousedown", e => {
            if (e.button !== 0) return;

            // Skip if clicking resize/rotate handles
            if (e.target.closest(".resize-handle") || e.target.closest(".rotate-handle")) return;

            selectCard(card, e.shiftKey);

            // Begin drag
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            cardStartX = parseFloat(card.dataset.x);
            cardStartY = parseFloat(card.dataset.y);

            e.preventDefault();
        });

        document.addEventListener("mousemove", e => {
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

        // Normal click selection
        card.addEventListener("click", e => {
            if (e.button !== 0) return;
            selectCard(card, e.shiftKey);
        });
    }

    // -------------------------------------------
    // RIGHT CLICK ON PHOTO CARD
    // -------------------------------------------
    document.addEventListener("contextmenu", e => {

        const card = e.target.closest(".photo-card");
        if (!card) return;

        e.preventDefault();
        targetCard = card;

        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.style.display = "block";
    });

    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    // -------------------------------------------
    // CONTEXT MENU HANDLE ACTIONS
    // -------------------------------------------
    menu.addEventListener("click", e => {

        if (!targetCard) return;
        menu.style.display = "none";

        const action = e.target.dataset.action;
        if (!action) return;

        switch (action) {

            // DELETE
            case "delete":
                targetCard.remove();
                break;

            // REMOVE FRAME ONLY
            case "remove-frame":
                const frame = targetCard.querySelector(".photo-frame");
                if (frame) {
                    frame.style.boxShadow = "none";
                    frame.style.padding = "0";
                    frame.style.background = "transparent";
                    frame.style.setProperty("--frame-thickness", "0px");
                }
                break;

            // DUPLICATE WITH FULL FUNCTIONALITY
            case "duplicate":

                const clone = targetCard.cloneNode(true);

                const x = parseFloat(targetCard.dataset.x);
                const y = parseFloat(targetCard.dataset.y);
                const rot = parseFloat(targetCard.dataset.rotation) || 0;

                clone.dataset.x = x + 30;
                clone.dataset.y = y + 30;
                clone.dataset.rotation = rot;

                clone.style.transform =
                    `translate(${x + 30}px, ${y + 30}px) rotate(${rot}deg)`;

                document.getElementById("photo-container").appendChild(clone);

                // ⭐ NOW THE KEY PART:
                // give duplicate full dragging + selection
                attachCloneBehavior(clone);

                break;
        }

        targetCard = null;
    });

});
