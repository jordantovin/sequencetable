// ============================================
// WALL-LAYOUT.JS - Wall, Frames, Save/Load
// ============================================

// WALL MANAGEMENT
function updateWallScale() {
    if (suppressWallUpdate) return;
    let wInput = document.getElementById('wallWidthInput').value;
    let hInput = document.getElementById('wallHeightInput').value;
    wallUnit = document.getElementById('wallUnit').value;

    if (!wInput || !hInput || isNaN(parseFloat(wInput)) || isNaN(parseFloat(hInput))) {
        wallWidthReal = 12;
        wallHeightReal = 10;
        wallUnit = 'ft';

        document.getElementById('wallWidthInput').value = 12;
        document.getElementById('wallHeightInput').value = 10;
        document.getElementById('wallUnit').value = 'ft';
    } else {
        wallWidthReal = parseFloat(wInput);
        wallHeightReal = parseFloat(hInput);
    }

    mockWall.style.display = 'none';

    const LEFT_UI = 300;
    const RIGHT_MARGIN = 40;
    const availableHeight = window.innerHeight - 40 - 20;
    const availableWidth = window.innerWidth - LEFT_UI - RIGHT_MARGIN;

    let widthFeet, heightFeet;

    if (wallUnit === 'm') {
        widthFeet = wallWidthReal * 3.28084;
        heightFeet = wallHeightReal * 3.28084;
    } else if (wallUnit === 'in') {
        widthFeet = wallWidthReal / 12;
        heightFeet = wallHeightReal / 12;
    } else {
        widthFeet = wallWidthReal;
        heightFeet = wallHeightReal;
    }

    const scaleX = availableWidth / widthFeet;
    const scaleY = availableHeight / heightFeet;

    scaleFactor = Math.min(scaleX, scaleY);

    mockWall.style.display = 'block';
    mockWall.style.width = `${widthFeet * scaleFactor}px`;
    mockWall.style.height = `${heightFeet * scaleFactor}px`;

    const resetWallBtn = document.getElementById("resetWallBtn");
    resetWallBtn.style.setProperty("display", "inline-flex", "important");

    reapplyFrameToAll();

    loadedImages.forEach(card => {
        const widthPx = parseFloat(card.style.width);
        const heightPx = parseFloat(card.style.height);
        updateDimensionsLabel(card, widthPx, heightPx);
    });
    updateWallDimensionLines();
    applyWallDimensionVisibility();
}

function updateWallDimensionLines() {
    if (mockWall.style.display === "none") return;

    const wFeet = (wallUnit === "m")
        ? wallWidthReal * 3.28084
        : (wallUnit === "in")
        ? wallWidthReal / 12
        : wallWidthReal;

    const hFeet = (wallUnit === "m")
        ? wallHeightReal * 3.28084
        : (wallUnit === "in")
        ? wallHeightReal / 12
        : wallHeightReal;

    const wPx = wFeet * scaleFactor;
    const hPx = hFeet * scaleFactor;

    // WIDTH LINE (BLUE)
    if (!wallWidthLine) {
        wallWidthLine = document.createElement("div");
        wallWidthLine.style.position = "absolute";
        wallWidthLine.style.height = "2px";
        wallWidthLine.style.background = "blue";
        wallWidthLine.style.left = "0px";
        mockWall.appendChild(wallWidthLine);
    }

    if (!wallWidthLabel) {
        wallWidthLabel = document.createElement("div");
        wallWidthLabel.style.position = "absolute";
        wallWidthLabel.style.color = "blue";
        wallWidthLabel.style.fontFamily = "Helvetica,sans-serif";
        wallWidthLabel.style.fontSize = "12px";
        wallWidthLabel.style.pointerEvents = "none";
        mockWall.appendChild(wallWidthLabel);
    }

    wallWidthLine.style.top = `${hPx + 8}px`;
    wallWidthLine.style.width = `${wPx}px`;

    let widthLabel;
    if (wallUnit === "m") widthLabel = `${wallWidthReal} m`;
    else if (wallUnit === "in") widthLabel = `${wallWidthReal}"`;
    else widthLabel = `${wallWidthReal} ft`;

    wallWidthLabel.textContent = widthLabel;
    wallWidthLabel.style.top = `${hPx + 12}px`;
    wallWidthLabel.style.left = `${wPx / 2 - 20}px`;

    // HEIGHT LINE (RED)
    if (!wallHeightLine) {
        wallHeightLine = document.createElement("div");
        wallHeightLine.style.position = "absolute";
        wallHeightLine.style.width = "2px";
        wallHeightLine.style.background = "red";
        wallHeightLine.style.top = "0px";
        mockWall.appendChild(wallHeightLine);
    }

    if (!wallHeightLabel) {
        wallHeightLabel = document.createElement("div");
        wallHeightLabel.style.position = "absolute";
        wallHeightLabel.style.color = "red";
        wallHeightLabel.style.fontFamily = "Helvetica,sans-serif";
        wallHeightLabel.style.fontSize = "12px";
        wallHeightLabel.style.pointerEvents = "none";
        mockWall.appendChild(wallHeightLabel);
    }

    wallHeightLine.style.left = `${wPx + 8}px`;
    wallHeightLine.style.height = `${hPx}px`;

    let heightLabel;
    if (wallUnit === "m") heightLabel = `${wallHeightReal} m`;
    else if (wallUnit === "in") heightLabel = `${wallHeightReal}"`;
    else heightLabel = `${wallHeightReal} ft`;

    wallHeightLabel.textContent = heightLabel;
    wallHeightLabel.style.left = `${wPx + 12}px`;
    const labelFeet = convertLabelValueToFeet(wallHeightReal, wallUnit);
    const labelY = (labelFeet * scaleFactor) - 10;
    wallHeightLabel.style.top = `${labelY}px`;
}

function applyWallDimensionVisibility() {
    const show = wallDimensionsVisible ? "block" : "none";

    if (wallWidthLine) wallWidthLine.style.display = show;
    if (wallWidthLabel) wallWidthLabel.style.display = show;
    if (wallHeightLine) wallHeightLine.style.display = show;
    if (wallHeightLabel) wallHeightLabel.style.display = show;
}

// HANG HEIGHT
function setHangHeight() {
    if (mockWall.style.display === "none") {
        alert("Create a wall first.");
        return;
    }

    const val = parseFloat(document.getElementById('hangHeightInput').value);
    const unit = document.getElementById('hangHeightUnit').value;

    if (isNaN(val) || val <= 0) {
        alert("Enter a valid height.");
        return;
    }

    let hFeet;
    switch (unit) {
        case 'ft': hFeet = val; break;
        case 'in': hFeet = val / 12; break;
        case 'cm': hFeet = val / 30.48; break;
        case 'm': hFeet = val * 3.28084; break;
    }

    const yPx = hFeet * scaleFactor;

    if (!hangLine) {
        hangLine = document.createElement('div');
        hangLine.id = 'hangLine';
        mockWall.appendChild(hangLine);
    }

    if (!hangLineLabel) {
        hangLineLabel = document.createElement('div');
        hangLineLabel.id = 'hangLineLabel';
        hangLine.appendChild(hangLineLabel);
    }

    const wallHeightPx = mockWall.offsetHeight;
    hangLine.style.top = `${wallHeightPx - yPx}px`;
    hangLineLabel.textContent = `${val} ${unit} from ground`;
}

function updateHangHeight() {
    if (mockWall.style.display === "none") return;

    const val = parseFloat(document.getElementById('hangHeightInput').value);
    const unit = document.getElementById('hangHeightUnit').value;

    if (!isNaN(val) && val > 0) {
        setHangHeight();
    }
}

// FRAME TOOLS
document.getElementById("frameUnitMaster").addEventListener("input", () => {
    const newUnit = document.getElementById("frameUnitMaster").value;
    liveFrameSettings.unit = newUnit;

    loadedImages
        .filter(card => card.isFramedUpload)
        .forEach(card => {
            card.frameUnit = newUnit;
            applyFrameToCard(card);
            updateDimensionsLabel(card,
                parseFloat(card.style.width),
                parseFloat(card.style.height)
            );
        });
});

document.getElementById("matteInput").addEventListener("input", () => {
    liveFrameSettings.matte = parseFloat(document.getElementById("matteInput").value) || 0;
});

document.getElementById("frameInput").addEventListener("input", () => {
    liveFrameSettings.frame = parseFloat(document.getElementById("frameInput").value) || 0;
});

// Frame Color Picker
const frameColorBtn = document.getElementById("frameColorBtn");
let framePicker = document.getElementById("frameColorPicker");
if (!framePicker) {
    framePicker = document.createElement("input");
    framePicker.type = "color";
    framePicker.id = "frameColorPicker";
    framePicker.style.position = "absolute";
    framePicker.style.opacity = "0";
    framePicker.style.width = "40px";
    framePicker.style.height = "40px";
    framePicker.style.left = "250px";
    framePicker.style.top = "100px";
    document.body.appendChild(framePicker);
}

frameColorBtn.style.backgroundColor = frameColor;
frameColorBtn.style.setProperty("--frame-color", frameColor);

frameColorBtn.addEventListener("click", () => {
    framePicker.click();
});

framePicker.addEventListener("input", e => {
    frameColor = e.target.value;
    liveFrameSettings.color = frameColor;
    frameColorBtn.style.setProperty("--frame-color", frameColor);
});

// DRAG FRAME TOOL
function createDragGhost() {
    dragGhost = document.createElement("div");
    dragGhost.id = "dragFrameGhost";
    document.body.appendChild(dragGhost);
}
createDragGhost();

const dragFrameBtn = document.getElementById("dragFrameBtn");
const framePopover = document.getElementById("framePopover");

dragFrameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = framePopover.style.display === "flex";
    framePopover.style.display = isVisible ? "none" : "flex";
    frameColorBtn.style.display = isVisible ? "none" : "inline-block";
});

document.addEventListener("mousedown", (e) => {
    if (dragFrameActive) return;
    if (e.target.closest(".image-card")) return;
    if (!framePopover.contains(e.target) && !dragFrameBtn.contains(e.target)) {
        framePopover.style.display = "none";
        frameColorBtn.style.display = "none";
    }
});

document.getElementById("dragFrameBtn").addEventListener("click", () => {
    dragFrameActive = true;
    dragGhost.style.display = "block";
});

document.addEventListener("mousemove", e => {
    if (!dragFrameActive) return;
    dragGhost.style.left = (e.pageX - dragGhost.offsetWidth / 2) + "px";
    dragGhost.style.top = (e.pageY - dragGhost.offsetHeight / 2) + "px";
});

document.addEventListener("mouseup", e => {
    if (!dragFrameActive) return;

    dragFrameActive = false;
    dragGhost.style.display = "none";

    const dropX = e.pageX;
    const dropY = e.pageY;

    let targetCard = null;

    loadedImages.forEach(card => {
        const r = card.getBoundingClientRect();
        if (dropX >= r.left && dropX <= r.right &&
            dropY >= r.top && dropY <= r.bottom) {
            targetCard = card;
        }
    });

    if (!targetCard) return;

    targetCard.isFramedUpload = true;
    targetCard.matteValue = liveFrameSettings.matte;
    targetCard.frameValue = liveFrameSettings.frame;
    targetCard.frameUnit = liveFrameSettings.unit;
    targetCard.frameColor = liveFrameSettings.color;

    applyFrameToCard(targetCard);
    updateDimensionsLabel(
        targetCard,
        parseFloat(targetCard.style.width),
        parseFloat(targetCard.style.height)
    );

    undoStack.push({
        type: "frameAdd",
        card: targetCard,
        prevState: { matte: null, frame: null, unit: null, color: null },
        newState: {
            matte: targetCard.matteValue,
            frame: targetCard.frameValue,
            unit: targetCard.frameUnit,
            color: targetCard.frameColor
        }
    });
    redoStack.length = 0;
});

// WALL POPOVER
const wallBtn = document.getElementById("setWallBtn");
const wallPopover = document.getElementById("wallPopover");
const wallColorBtn = document.getElementById("wallColorBtn");

let wallColorPicker = document.getElementById("wallColorPicker");
if (!wallColorPicker) {
    wallColorPicker = document.createElement("input");
    wallColorPicker.type = "color";
    wallColorPicker.id = "wallColorPicker";
    wallColorPicker.style.position = "absolute";
    wallColorPicker.style.opacity = "0";
    wallColorPicker.style.width = "40px";
    wallColorPicker.style.height = "40px";
    wallColorPicker.style.left = "300px";
    wallColorPicker.style.top = "100px";
    document.body.appendChild(wallColorPicker);
}

wallBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (wallPopoverOpen) {
        wallPopoverOpen = false;
        wallPopover.style.display = "none";
        updateWallScale();
        mockWall.style.display = "block";
        const resetWallBtn = document.getElementById("resetWallBtn");
        resetWallBtn.style.display = "inline-flex";
        return;
    }

    wallPopoverOpen = true;
    wallPopover.style.display = "flex";
});

document.addEventListener("mousedown", (e) => {
    if (!wallPopover.contains(e.target) && !wallBtn.contains(e.target)) {
        wallPopover.style.display = "none";
    }
});

wallColorBtn.addEventListener("click", () => {
    wallColorPicker.click();
});

wallColorPicker.addEventListener("input", (e) => {
    const c = e.target.value;
    wallColorBtn.style.setProperty("--wall-color", c);
    mockWall.style.backgroundColor = c;
});

const resetWallBtn = document.getElementById("resetWallBtn");
resetWallBtn.addEventListener("click", () => {
    mockWall.style.display = "none";
    resetWallBtn.style.display = "none";

    if (hangLine) {
        hangLine.remove();
        hangLine = null;
        hangLineLabel = null;
    }
});

// HANG HEIGHT POPOVER
const hhBtn = document.getElementById("hangHeightBtn");
const hhPopover = document.getElementById("hangHeightPopover");
const hhInput = document.getElementById("hangHeightInput");
const hhUnit = document.getElementById("hangHeightUnit");

hhBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const val = parseFloat(hhInput.value);
    const hasValue = !isNaN(val) && val > 0;

    if (hasValue && hangLine && !hhOpen) {
        hangLine.remove();
        hangLine = null;
        hangLineLabel = null;
        hhPopover.style.display = "none";
        hhOpen = false;
        wallDimensionsVisible = !wallDimensionsVisible;
        applyWallDimensionVisibility();
        return;
    }

    hhOpen = !hhOpen;
    hhPopover.style.display = hhOpen ? "flex" : "none";

    if (hhOpen) {
        updateHangHeight();
    }

    wallDimensionsVisible = !wallDimensionsVisible;
    applyWallDimensionVisibility();
});

document.addEventListener("mousedown", (e) => {
    if (!hhPopover.contains(e.target) && !hhBtn.contains(e.target)) {
        hhPopover.style.display = "none";
        hhOpen = false;
    }
});

hhInput.addEventListener("input", updateHangHeight);
hhUnit.addEventListener("change", updateHangHeight);

window.addEventListener("resize", updateWallDimensionLines);

// GLOBAL SCALE
const barH = document.getElementById('globalScaleBarH');
const handleH = document.getElementById('globalScaleHandleH');

function startScaleDragH(e) {
    e.preventDefault();
    scaleDraggingH = true;
    document.addEventListener('mousemove', scaleDragH);
    document.addEventListener('mouseup', stopScaleDragH);
}

function stopScaleDragH() {
    scaleDraggingH = false;
    document.removeEventListener('mousemove', scaleDragH);
    document.removeEventListener('mouseup', stopScaleDragH);
}

function scaleDragH(e) {
    if (!scaleDraggingH) return;

    const rect = barH.getBoundingClientRect();
    const barLeft = rect.left;
    const barWidth = rect.width;

    let mouseX = e.clientX - barLeft;
    mouseX = Math.max(0, Math.min(barWidth, mouseX));

    const clampedLeft = mouseX - (handleH.offsetWidth / 2);
    handleH.style.left = `${Math.max(0, Math.min(clampedLeft, barWidth - handleH.offsetWidth))}px`;

    const pct = mouseX / barWidth;
    globalScale = 0.1 + pct * (4 - 0.1);

    applyGlobalScaleH();
}

function applyGlobalScaleH() {
    loadedImages.forEach(card => {
        if (!card._origW) {
            card._origW = card.offsetWidth;
            card._origH = card.offsetHeight;
        }

        card.keepSize = true;
        const newW = card._origW * globalScale;
        const newH = card._origH * globalScale;

        card.style.width = `${newW}px`;
        card.style.height = `${newH}px`;

        if (demensVisible) {
            updateDimensionsLabel(card, newW, newH);
        }
    });

    if (isSortingGrid) applyGridSort(loadedImages);
}

barH.addEventListener('mousedown', startScaleDragH);
handleH.addEventListener('mousedown', startScaleDragH);

// SAVE/LOAD LAYOUT
function collectLayoutObject() {
    return {
        cards: loadedImages.map(card => ({
            src: card.dataset.uploadId 
                ? ("local:" + card.dataset.uploadId)
                : card.querySelector("img").src,
            photographer: card.querySelector(".metadata")?.textContent || "",
            left: card.style.left,
            top: card.style.top,
            width: card.style.width,
            height: card.style.height,
            zIndex: card.style.zIndex,
            aspectRatio: card.aspectRatio,
            resized: card.resized || false,
            keepSize: card.keepSize || false,
            isFramedUpload: card.isFramedUpload || false,
            matteValue: card.matteValue ?? null,
            frameValue: card.frameValue ?? null,
            frameUnit: card.frameUnit ?? null,
            frameColor: card.frameColor ?? null
        })),
        wall: {
            width: wallWidthReal,
            height: wallHeightReal,
            unit: wallUnit,
            scale: scaleFactor,
            color: mockWall.style.backgroundColor || null,
            visible: mockWall.style.display !== "none"
        },
        hangHeight: hangLine ? {
            value: document.getElementById("hangHeightInput").value,
            unit: document.getElementById("hangHeightUnit").value,
            enabled: document.getElementById("hangHeightToggle")?.checked,
            yPx: hangLine.style.top
        } : null
    };
}

function restoreLayoutFromObject(layout) {
    gallery.innerHTML = "";
    loadedImages.length = 0;

    layout.cards.forEach(item => {
        let src = item.src;

        if (src.startsWith("local:")) {
            const id = src.replace("local:", "");
            const stored = localStorage.getItem(id);
            if (stored) src = stored;
        }

        const card = createImageCard(src, item.photographer || "");
        card.resized = true;
        card.keepSize = true;
        const img = card.querySelector("img");

        if (item.src.startsWith("local:")) {
            card.dataset.uploadId = item.src.replace("local:", "");
        }

        function applyProps() {
            card._restoring = true;
            card.style.left = item.left;
            card.style.top = item.top;
            card.style.width = item.width;
            card.style.height = item.height;
            card.aspectRatio = item.aspectRatio;
            card.resized = true;
            card.keepSize = true;
            card.style.zIndex = item.zIndex || card.style.zIndex;
            card.isFramedUpload = (item.isFramedUpload === true);

            if (card.isFramedUpload) {
                card.matteValue = item.matteValue;
                card.frameValue = item.frameValue;
                card.frameUnit = item.frameUnit;
                card.frameColor = item.frameColor;
                card.needsFrameReapply = true;
            }

            updateDimensionsLabel(card, parseFloat(item.width), parseFloat(item.height));
            delete card._restoring;
        }

        if (img.complete) applyProps();
        else img.addEventListener("load", applyProps);
    });

    if (layout.wall && layout.wall.visible) {
        document.getElementById("wallWidthInput").value = layout.wall.width;
        document.getElementById("wallHeightInput").value = layout.wall.height;
        document.getElementById("wallUnit").value = layout.wall.unit;
        mockWall.style.backgroundColor = layout.wall.color || "#f0f0f0";
        updateWallScale();
    }

    if (layout.cards.some(c => c.isFramedUpload)) {
        const cfg = layout.cards.find(c => c.isFramedUpload);
        document.getElementById("matteInput").value = cfg.matteValue;
        document.getElementById("frameInput").value = cfg.frameValue;
        document.getElementById("frameUnitMaster").value = cfg.frameUnit;
    }

    loadedImages.forEach(card => {
        if (card.needsFrameReapply) {
            applyFrameToCard(card);
            delete card.needsFrameReapply;
        }
    });

    if (layout.hangHeight && layout.wall.visible) {
        document.getElementById("hangHeightInput").value = layout.hangHeight.value;
        document.getElementById("hangHeightUnit").value = layout.hangHeight.unit;
        if (document.getElementById("hangHeightToggle")) {
            document.getElementById("hangHeightToggle").checked = layout.hangHeight.enabled;
        }
        setHangHeight();
    }
}

function loadLayoutFile(file) {
    const reader = new FileReader();

    reader.onload = () => {
        try {
            const layout = JSON.parse(reader.result);
            restoreLayoutFromObject(layout);
            alert("Layout successfully loaded!");
        } catch (err) {
            console.error(err);
            alert("Failed to load layout file. It may be corrupted.");
        }
    };

    reader.readAsText(file);
}

function downloadLayoutFile() {
    let name = prompt("Enter a file name:", "sequence-table");
    if (!name) return;
    name = name.trim().replace(/[^a-zA-Z0-9-_ ]/g, "");
    if (name.length === 0) name = "sequence-table";
    if (!name.toLowerCase().endsWith(".sequence"))
        name += ".sequence";

    const layout = collectLayoutObject();
    const json = JSON.stringify(layout, null, 2);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();

    URL.revokeObjectURL(url);
    alert(`Saved as "${name}".`);
}

document.getElementById("loadLayoutBtn").addEventListener("click", () => {
    document.getElementById("loadLayoutInput").click();
});

document.getElementById("loadLayoutInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadLayoutFile(file);
});

document.getElementById("saveLayoutBtn").addEventListener("click", downloadLayoutFile);

// INFO POPUP
window.addEventListener('load', () => {
    const infoLink = document.getElementById('infoLink');
    const infoPopup = document.getElementById('infoPopup');
    const closeInfoLink = document.getElementById('closeInfoLink');

    if (infoLink && infoPopup) {
        infoLink.addEventListener('click', e => {
            e.preventDefault();
            infoPopup.style.display = 'flex';
        });
    }

    if (closeInfoLink && infoPopup) {
        closeInfoLink.addEventListener('click', e => {
            e.preventDefault();
            infoPopup.style.display = 'none';
        });
    }

    if (infoPopup) {
        infoPopup.addEventListener('click', e => {
            if (e.target === infoPopup) {
                infoPopup.style.display = 'none';
            }
        });
    }
});

// LOAD FROM URL
(function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("data");
    if (!encoded) return;

    try {
        const json = atob(encoded);
        const layout = JSON.parse(json);
        restoreLayoutFromObject(layout);
        console.log("Layout restored from URL.");
    } catch (err) {
        console.error("Load failed:", err);
    }
})();
