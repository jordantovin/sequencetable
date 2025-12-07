/* ==========================================================
   PHOTO CARDS — FULL MERGED VERSION
   Adds .photo-dimensions + updateCardDimensionsText integration
   Dimensions now measure PICTURE only (not frame/matte)
   ========================================================== */

(function() {
    let photoCards = [];
    let csvData = [];
    let currentPhotoIndex = 0;

    let activeCard = null;
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;

    let isResizing = false;
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartWidth = 0;
    let resizeStartHeight = 0;

    let areNamesVisible = true;

    // SELECTION
    const selectedCards = new Set();
    window.getSelectedCards = () => Array.from(selectedCards);

    function handleCardSelection(card, event) {
        if (event.target.closest('.resize-handle') ||
            event.target.closest('.rotate-handle')) {
            return;
        }

        const alreadySelected = card.classList.contains("selected");

        if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
            if (!alreadySelected || selectedCards.size > 1) {
                selectedCards.forEach(c => c.classList.remove("selected"));
                selectedCards.clear();
            }
        }

        if (alreadySelected) {
            card.classList.remove("selected");
            selectedCards.delete(card);
        } else {
            card.classList.add("selected");
            selectedCards.add(card);
        }
    }

    /* ==========================================================
       CSV LOAD
       ========================================================== */
    async function loadCSVData() {
        try {
            const response = await fetch(
                'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv'
            );
            const text = await response.text();
            const rows = text.split("\n");

            csvData = rows.slice(1).filter(r => r.trim()).map(row => {
                const [link, photographer] = row.split(",");
                return {
                    link: link?.trim() || "",
                    photographer: photographer?.trim() || "Unknown"
                };
            });
        } catch (e) {
            console.error("CSV error:", e);
        }
    }

    /* ==========================================================
       CREATE CARD
       ========================================================== */
    function createPhotoCard(imageUrl, photographer = "Unknown") {
        const card = document.createElement("div");
        card.className = "photo-card";
        card.dataset.rotation = "0";

        const randX = Math.random() * (window.innerWidth - 400) + 50;
        const randY = Math.random() * (window.innerHeight - 400) + 150;

        card.dataset.x = randX;
        card.dataset.y = randY;

        /* FRAME WRAPPER */
        const frame = document.createElement("div");
        frame.className = "photo-frame";

        /* IMAGE */
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = photographer;

        img.onload = function() {
            const ratio = img.naturalHeight / img.naturalWidth;
            img.style.width = "300px";
            img.style.height = `${300 * ratio}px`;
            
            // Store natural dimensions on the image for dimension calculations
            img.dataset.naturalWidth = img.naturalWidth;
            img.dataset.naturalHeight = img.naturalHeight;
            
            window.updateCardDimensionsText?.(card);
        };

        frame.appendChild(img);
        card.appendChild(frame);

        /* CAPTION */
        const caption = document.createElement("div");
        caption.className = "photo-caption";
        caption.textContent = photographer;
        caption.style.display = areNamesVisible ? "" : "none";
        card.appendChild(caption);

        /* DIMENSIONS LABEL */
        const dim = document.createElement("div");
        dim.className = "photo-dimensions";
        dim.style.display = "none"; // hidden until toggled
        card.appendChild(dim);

        /* ADD RESIZE HANDLE */
        const resizeHandle = document.createElement("div");
        resizeHandle.className = "resize-handle";
        resizeHandle.textContent = "⇲";
        frame.appendChild(resizeHandle);

        /* ROTATE HANDLE */
        const rotateHandle = document.createElement("div");
        rotateHandle.className = "rotate-handle";
        rotateHandle.textContent = "↻";
        frame.appendChild(rotateHandle);

        document.getElementById("photo-container").appendChild(card);

        makeCardInteractive(card);
        updateCardTransform(card);

        return card;
    }

    /* ==========================================================
       CARD INTERACTIVITY
       ========================================================== */
    function makeCardInteractive(card) {

        /* SELECT ON CLICK */
        card.addEventListener("click", e => handleCardSelection(card, e));

        /* DRAGGING */
        card.addEventListener("mousedown", function(e) {
            if (e.target.classList.contains("resize-handle")) return;
            if (e.target.classList.contains("rotate-handle")) return;

            if (e.target.classList.contains("photo-caption")) return;

            isDragging = true;
            activeCard = card;

            dragOffset.x = e.clientX - parseFloat(card.dataset.x);
            dragOffset.y = e.clientY - parseFloat(card.dataset.y);

            card.style.zIndex = getHighestZ() + 1;

            e.preventDefault();
        });

        /* RESIZE */
        card.querySelector(".resize-handle").addEventListener("mousedown", e => {
            isResizing = true;
            activeCard = card;

            const img = card.querySelector("img");

            resizeStartX = e.clientX;
            resizeStartY = e.clientY;
            resizeStartWidth = img.offsetWidth;
            resizeStartHeight = img.offsetHeight;

            e.stopPropagation();
        });

        /* ROTATION */
        card.querySelector(".rotate-handle").addEventListener("mousedown", e => {
            activeCard = card;

            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
            const offset = startAngle - parseFloat(card.dataset.rotation);

            function move(ev) {
                const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
                card.dataset.rotation = angle - offset;
                updateCardTransform(card);
                window.updateCardDimensionsText?.(card);
            }

            function end() {
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", end);
            }

            document.addEventListener("mousemove", move);
            document.addEventListener("mouseup", end);

            e.stopPropagation();
        });
    }

    /* ==========================================================
       GLOBAL MOUSE EVENTS — DRAG + RESIZE
       ========================================================== */
    document.addEventListener("mousemove", e => {
        /* DRAGGING */
        if (isDragging && activeCard) {
            activeCard.dataset.x = e.clientX - dragOffset.x;
            activeCard.dataset.y = e.clientY - dragOffset.y;
            updateCardTransform(activeCard);
            window.updateCardDimensionsText?.(activeCard);
        }

        /* RESIZING */
        if (isResizing && activeCard) {
            const img = activeCard.querySelector("img");
            const dx = e.clientX - resizeStartX;

            const newWidth = Math.max(100, resizeStartWidth + dx);
            const ratio = resizeStartHeight / resizeStartWidth;

            img.style.width = `${newWidth}px`;
            img.style.height = `${newWidth * ratio}px`;

            window.updateCardDimensionsText?.(activeCard);
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        isResizing = false;
        activeCard = null;
    });

    /* ==========================================================
       HELPERS
       ========================================================== */
    function updateCardTransform(card) {
        const x = parseFloat(card.dataset.x);
        const y = parseFloat(card.dataset.y);
        const r = parseFloat(card.dataset.rotation);

        card.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg)`;
    }

    function getHighestZ() {
        let max = 1000;
        document.querySelectorAll(".photo-card").forEach(c => {
            const z = parseInt(c.style.zIndex) || 1000;
            if (z > max) max = z;
        });
        return max;
    }

    /* ==========================================================
       NAME VISIBILITY
       ========================================================== */
    function toggleNamesVisibility() {
        areNamesVisible = !areNamesVisible;
        document.querySelectorAll(".photo-caption").forEach(c => {
            c.style.display = areNamesVisible ? "" : "none";
        });
    }

    /* ==========================================================
       FILE UPLOAD
       ========================================================== */
    function handleFileUpload(e) {
        const files = e.target.files;

        for (let f of files) {
            if (f.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = ev => {
                    createPhotoCard(ev.target.result, "Upload");
                };
                reader.readAsDataURL(f);
            }
        }
    }

    /* ==========================================================
       ADD FROM CSV
       ========================================================== */
    function addPhotosFromCSV(count) {
        let added = 0;
        while (added < count && currentPhotoIndex < csvData.length) {
            const row = csvData[currentPhotoIndex];
            createPhotoCard(row.link, row.photographer);
            currentPhotoIndex++;
            added++;
        }
        if (currentPhotoIndex >= csvData.length) currentPhotoIndex = 0;
    }

    /* ==========================================================
       INIT
       ========================================================== */
    window.onload = function() {
        loadCSVData();

        const uploadBtn = document.getElementById("uploadPhotoBtn");
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        fileInput.onchange = handleFileUpload;
        document.body.appendChild(fileInput);
        uploadBtn.onclick = () => fileInput.click();

        document.getElementById("add5PhotosBtn").onclick = () =>
            addPhotosFromCSV(5);

        document.getElementById("add1PhotoBtn").onclick = () =>
            addPhotosFromCSV(1);

        const namesBtn = document.querySelector('[title="Names"]');
        namesBtn.onclick = toggleNamesVisibility;
    };
})();
