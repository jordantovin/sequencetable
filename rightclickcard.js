// ===============================
// RIGHT CLICK MENU FOR PHOTO CARDS (Batch-enabled)
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
    // -------------------------------------------
    function selectCard(card, additive = false) {
        if (!additive) {
            document.querySelectorAll(".photo-card.selected")
                .forEach(c => c.classList.remove("selected"));
        }
        card.classList.add("selected");
    }

    window.getSelectedCards = function() {
        return Array.from(document.querySelectorAll(".photo-card.selected"));
    };

    // -------------------------------------------
    // DRAG + CLICK SELECTION FOR CLONES
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
            if (e.target.closest(".resize-handle") || e.target.closest(".rotate-handle")) return;

            selectCard(card, e.shiftKey);

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

        // If right-clicking a card that is *not* selected → select only it
        if (!card.classList.contains("selected")) {
            selectCard(card);
        }

        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.style.display = "block";
    });

    document.addEventListener("click", () => {
        menu.style.display = "none";
    });

    // -------------------------------------------
    // CONTEXT MENU ACTIONS — BATCH ENABLED
    // -------------------------------------------
    menu.addEventListener("click", e => {

        const action = e.target.dataset.action;
        if (!action) return;

        menu.style.display = "none";

        // ⭐ ALL SELECTED CARDS
        const selectedCards = window.getSelectedCards();
        if (selectedCards.length === 0) return;

        switch (action) {

            // --------------------------------------------------
            // BATCH DELETE
            // --------------------------------------------------
            case "delete":
                selectedCards.forEach(card => card.remove());
                break;

            // --------------------------------------------------
            // BATCH REMOVE FRAME
            // --------------------------------------------------
            case "remove-frame":
                selectedCards.forEach(card => {
                    const frame = card.querySelector(".photo-frame");
                    if (frame) {
                        frame.style.boxShadow = "none";
                        frame.style.padding = "0";
                        frame.style.background = "transparent";
                        frame.style.setProperty("--frame-thickness", "0px");
                    }
                });
                break;

            // --------------------------------------------------
            // BATCH DUPLICATE
            // --------------------------------------------------
            case "duplicate":

                const container = document.getElementById("photo-container");

                selectedCards.forEach(card => {
                    const clone = card.cloneNode(true);

                    const x = parseFloat(card.dataset.x);
                    const y = parseFloat(card.dataset.y);
                    const rot = parseFloat(card.dataset.rotation) || 0;

                    clone.dataset.x = x + 30;
                    clone.dataset.y = y + 30;
                    clone.dataset.rotation = rot;

                    clone.style.transform =
                        `translate(${x + 30}px, ${y + 30}px) rotate(${rot}deg)`;

                    container.appendChild(clone);

                    // Re-enable drag, selection, context menu behavior
                    attachCloneBehavior(clone);
                });

                break;
        }
    });

});
