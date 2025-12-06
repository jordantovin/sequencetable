let frameColor = "black";   // default frame color

const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv';
const gallery = document.getElementById('gallery');
const loadedImages = [];
let imageWidth = 220;
let imageHeight = 165;
const MIN_SIZE = 50;
const leftOffset = 280;
const rightOffset = 10;
let imagesData = [];
const usedIndices = new Set();
let namesVisible = false;
let zIndexCounter = 10000;
let suppressWallUpdate = false;
let liveFrameSettings = {
    matte: 0,
    frame: 0,
    unit: "in",
    color: "black"
};

// Grid lock / sorting mode
let isSortingGrid = false;
let originalGridOrder = [];
let lockButton;
let wallDimensionsVisible = false;

// Undo / Redo stacks
const undoStack = [];
const redoStack = [];

function updateZIndex(element) {
    zIndexCounter++;
    element.style.zIndex = zIndexCounter;
}

// Mobile sizing
function adjustForMobile() {
    if (window.innerWidth < 768) {
        imageWidth = 130;
        imageHeight = 95;
    } else {
        imageWidth = 220;
        imageHeight = 165;
    }
    loadedImages.forEach(card => {
        if (!card.resized) {
            card.style.width = `${imageWidth}px`;
            card.style.height = `${card.offsetWidth / (card.aspectRatio || 1.5)}px`;
        }
    });
}
window.addEventListener('resize', adjustForMobile);
adjustForMobile();

// Fetch CSV
async function fetchCSV() {
    const response = await fetch(sheetURL);
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });
    imagesData = parsed.data
        .filter(row => row.Link && row.Photographer)
        .map(row => ({
            src: row.Link.trim(),
            photographer: row.Photographer.trim()
        }));
}

// Unique random images
function getUniqueRandomImages(count) {
    const availableIndices = imagesData.map((_, idx) => idx).filter(idx => !usedIndices.has(idx));
    if (!availableIndices.length) return [];
    const selected = [];
    for (let i = 0; i < count && availableIndices.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const chosen = availableIndices[randomIndex];
        availableIndices.splice(randomIndex, 1);
        usedIndices.add(chosen);
        selected.push(imagesData[chosen]);
    }
    return selected;
}

// Create card
function createImageCard(src, photographer = "Local Upload") {
    const galleryWidth = gallery.clientWidth;
    const galleryHeight = window.innerHeight;

    const card = document.createElement('div');
    card.className = 'image-card';
    card.style.position = "absolute";
    card.style.overflow = "visible";

    card.style.left = Math.random() * (galleryWidth - imageWidth - leftOffset - rightOffset) + leftOffset + 'px';
    card.style.top = Math.max(100, Math.random() * (galleryHeight - imageHeight - 10)) + 'px';
    card.style.zIndex = zIndexCounter;
    card.style.width = `${imageWidth}px`;
    card.style.height = `${imageHeight}px`;
    card.resized = false;

    // FRAME WRAPPER
    const frameWrapper = document.createElement('div');
    frameWrapper.className = "frame-wrapper";
    frameWrapper.style.position = "relative";
    frameWrapper.style.display = "inline-block";

    // IMAGE
    const imageEl = document.createElement('img');
    imageEl.src = src;
    imageEl.style.display = "block";

    frameWrapper.appendChild(imageEl);
    card.appendChild(frameWrapper);

    // INFO WRAPPER
    const infoWrapper = document.createElement('div');
    infoWrapper.className = "info-wrapper";
    card.appendChild(infoWrapper);

    // METADATA
    const metadata = document.createElement('div');
    metadata.className = 'metadata';
    metadata.textContent = photographer;
    metadata.style.display = namesVisible ? 'block' : 'none';
    infoWrapper.appendChild(metadata);

    // DIM LABEL
    const dimLabel = document.createElement('div');
    dimLabel.className = 'dim-label';
    dimLabel.style.display = 'none';
    infoWrapper.appendChild(dimLabel);

    dimLabel.addEventListener('click', (e) => startInlineEdit(e, card));
    dimLabel.dataset.created = "true";

   // HANDLE IMAGE LOAD
imageEl.onload = () => {
    let naturalWidth = imageEl.naturalWidth || 1;
    let naturalHeight = imageEl.naturalHeight || 1;

    const MAX_SIDE = 1000;
    if (naturalWidth > MAX_SIDE || naturalHeight > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(naturalWidth, naturalHeight);
        naturalWidth = Math.round(naturalWidth * scale);
        naturalHeight = Math.round(naturalHeight * scale);
    }

    card.aspectRatio = naturalWidth / naturalHeight;

    // 👉 Only auto-size *brand new* cards.
    // If the card already has an explicit size (from a saved layout,
    // manual resize, inline edit, etc.), do NOT overwrite it.
    if (!card.resized && !card.keepSize) {
        let width = window.innerWidth < 768 ? 130 : 220;
        let height = width / card.aspectRatio;

        if (width > naturalWidth) {
            width = naturalWidth;
            height = naturalHeight;
        }

        card.style.width = `${width}px`;
        card.style.height = `${height}px`;
    }

    // Always add resize handles
    const handles = ['nw','ne','sw','se'].map(dir => {
        const h = document.createElement('div');
        h.className = `resize-handle ${dir}`;
        card.appendChild(h);
        return { class: dir, element: h };
    });

    makeResizable(card, handles);
};


    gallery.appendChild(card);
    makeDraggable(card);
    loadedImages.push(card);

    return card;
}

function addImages(count) {
    const subset = getUniqueRandomImages(count);
    const addedCards = subset.map(img => createImageCard(img.src, img.photographer));

    if (addedCards.length) {
        undoStack.push({ type: 'add', cards: addedCards });
        redoStack.length = 0;
    }
}

// Erase all
function eraseAll() {
    if (loadedImages.length) {
        undoStack.push({ type: 'removeAll', cards: [...loadedImages] });
        redoStack.length = 0;
    }
    gallery.innerHTML = '';
    loadedImages.length = 0;
    usedIndices.clear();
    mockWall.style.display = 'none';
}

// GRID LAYOUT
function applyGridSort(imagesArray) {
    const galleryWidth = gallery.clientWidth;

    const gutter = 60;       // horizontal spacing
    const rowSpacing = 80; 
    const startX = leftOffset;
    const startY = 110;

    let x = startX;
    let y = startY;
    let maxRowHeight = 0;

    imagesArray.forEach(card => {
        let width = parseFloat(card.style.width) || (window.innerWidth < 768 ? 130 : 220);
        let height = parseFloat(card.style.height) || (width / (card.aspectRatio || 1.5));

        // Only auto-resize cards that haven't been manually resized
        if (!card.keepSize && !card.resized) {
            const aspect = card.aspectRatio || (width / height) || 1.5;
            width = window.innerWidth < 768 ? 130 : 220;
            height = width / aspect;
        }

        // Wrap row
        if (x + width + rightOffset > galleryWidth) {
            x = startX;
            y += maxRowHeight + gutter;
            maxRowHeight = 0;
        }

        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
        card.style.width = `${width}px`;
        card.style.height = `${height}px`;

        x += width + gutter;
        maxRowHeight = Math.max(maxRowHeight, height);

        gallery.appendChild(card);

        const infoWrapper = card.querySelector('.info-wrapper');
        const dimLabel = card.querySelector('.dim-label');
        if (dimLabel && infoWrapper && dimLabel.parentNode !== infoWrapper) {
            infoWrapper.appendChild(dimLabel);
        }
    });

    const totalHeight = y + maxRowHeight + 200;
    gallery.style.height = `${totalHeight}px`;
    document.body.style.height = `${totalHeight}px`;
}

// Snap to grid
function snapToGrid(forceSnap = false) {
    if (!loadedImages.length) return;
    if (!isSortingGrid && !forceSnap) return;

    // Snapshot for undo
    const snapshot = loadedImages.map(card => ({
        card,
        left: card.style.left,
        top: card.style.top,
        width: card.style.width,
        height: card.style.height,
        zIndex: card.style.zIndex
    }));
    undoStack.push({ type: 'snapgrid', snapshot });
    redoStack.length = 0;

    const sortedImages = loadedImages.slice().sort((a, b) => {
        const topA = parseFloat(a.style.top);
        const topB = parseFloat(b.style.top);
        return Math.abs(topA - topB) < 50
            ? parseFloat(a.style.left) - parseFloat(b.style.left)
            : topA - topB;
    });

    loadedImages.length = 0;
    loadedImages.push(...sortedImages);

    applyGridSort(loadedImages);
}

// Upload
const uploadBtn = document.getElementById('uploadBtn');
const uploadInput = document.getElementById('uploadInput');
uploadBtn.addEventListener('click', () => uploadInput.click());

function convertLabelValueToFeet(value, unit) {
    switch(unit) {
        case "ft": return value;
        case "in": return value / 12;
        case "cm": return value / 30.48;
        case "m":  return value * 3.28084;
    }
    return value;
}

// Make draggable (supports multi-select + grid sort)
function makeDraggable(card) {
    let isDragging = false;
    let originalPositions = new Map();
    let originalGridOrderSnapshot = [];

    card.addEventListener('mousedown', startDrag);
    card.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        if (e.target.classList.contains('resize-handle') || e.target.tagName === 'INPUT') return;
        e.preventDefault();
        isDragging = true;

        const cardsToMove = selectedCards.has(card) ? Array.from(selectedCards) : [card];

        originalPositions.clear();
        cardsToMove.forEach(c => {
            updateZIndex(c);
            originalPositions.set(c, {
                left: parseFloat(c.style.left),
                top: parseFloat(c.style.top),
                index: loadedImages.indexOf(c)
            });
        });

        if (isSortingGrid) {
            if (!originalGridOrder.length) snapToGrid(true);
            originalGridOrderSnapshot = loadedImages.slice();
            cardsToMove.forEach(c => {
                c.classList.add('dragging-sort');
                c.style.transform = 'scale(1.05)';
            });
        }

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        cardsToMove.forEach(c => {
            const rect = c.getBoundingClientRect();
            originalPositions.get(c).offsetX = clientX - rect.left;
            originalPositions.get(c).offsetY = clientY - rect.top;
        });

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
    }

    function drag(e) {
        if (!isDragging) return;

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        const galleryRect = gallery.getBoundingClientRect();

        const cardsToMove = selectedCards.has(card) ? Array.from(selectedCards) : [card];

        cardsToMove.forEach(c => {
            const orig = originalPositions.get(c);
            c.style.left = `${clientX - galleryRect.left - orig.offsetX}px`;
            c.style.top = `${clientY - galleryRect.top - orig.offsetY}px`;

            // HANG HEIGHT SNAP
            if (hangLine) {
                const snapRange = 12;
                const lineY = hangLine.getBoundingClientRect().top;
                const cardRect = c.getBoundingClientRect();
                const cardCenterY = cardRect.top + cardRect.height / 2;

                if (Math.abs(cardCenterY - lineY) < snapRange) {
                    const delta = lineY - cardCenterY;
                    c.style.top = `${parseFloat(c.style.top) + delta}px`;
                }
            }
        });

        // Sorting logic when locked
        if (isSortingGrid) {
            const mainCard = card;
            const x = parseFloat(mainCard.style.left);
            const y = parseFloat(mainCard.style.top);
            const cardCenterX = x + mainCard.offsetWidth / 2;
            const cardCenterY = y + mainCard.offsetHeight / 2;

            let targetIndex = originalPositions.get(mainCard).index;
            let minDistance = Infinity;

            const currentGrid = loadedImages.filter(c => !cardsToMove.includes(c));
            const gutter = 30;
            const startX = leftOffset;
            const startY = 110;
            let currentX = startX;
            let currentY = startY;
            let maxRowHeight = 0;

            const tempPositions = [];
            currentGrid.forEach(c => {
                let width = parseFloat(c.style.width);
                let height = parseFloat(c.style.height);
                if (!c.resized && !c.keepSize) {
                    const aspect = c.aspectRatio || 1.5;
                    width = window.innerWidth < 768 ? 130 : 220;
                    height = width / aspect;
                }
                if (currentX + width + rightOffset > gallery.clientWidth) {
                    currentX = startX;
                    currentY += maxRowHeight + gutter;
                    maxRowHeight = 0;
                }
                tempPositions.push({ card: c, x: currentX, y: currentY, w: width, h: height });
                currentX += width + gutter;
                maxRowHeight = Math.max(maxRowHeight, height);
            });

            for (let i = 0; i <= tempPositions.length; i++) {
                const tempArray = [...currentGrid.slice(0, i), mainCard, ...currentGrid.slice(i)];
                let slotX = startX;
                let slotY = startY;
                maxRowHeight = 0;
                for (const tempCard of tempArray) {
                    let width = parseFloat(tempCard.style.width);
                    let height = parseFloat(tempCard.style.height);
                    if (!tempCard.resized && !tempCard.keepSize) {
                        const aspect = tempCard.aspectRatio || 1.5;
                        width = window.innerWidth < 768 ? 130 : 220;
                        height = width / aspect;
                    }
                    if (slotX + width + rightOffset > gallery.clientWidth) {
                        slotX = startX;
                        slotY += maxRowHeight + gutter;
                        maxRowHeight = 0;
                    }
                    if (tempCard === mainCard) {
                        const slotCenterX = slotX + width / 2;
                        const slotCenterY = slotY + height / 2;
                        const distance = Math.hypot(cardCenterX - slotCenterX, cardCenterY - slotCenterY);
                        if (distance < minDistance) {
                            minDistance = distance;
                            targetIndex = i;
                        }
                    }
                    slotX += width + gutter;
                    maxRowHeight = Math.max(maxRowHeight, height);
                }
            }

            if (targetIndex !== loadedImages.indexOf(mainCard)) {
                loadedImages.splice(originalPositions.get(mainCard).index, 1);
                loadedImages.splice(targetIndex, 0, mainCard);
                originalPositions.get(mainCard).index = targetIndex;
                applyGridSort(loadedImages);
            }
        }

        // Trash check
        const trash = document.getElementById('trashZone').getBoundingClientRect();
        const centerX = clientX;
        const centerY = clientY;
        cardsToMove.forEach(c => {
            if (centerX > trash.left && centerX < trash.right &&
                centerY > trash.top && centerY < trash.bottom) {
                undoStack.push({ type: 'remove', card: c, index: loadedImages.indexOf(c) });
                redoStack.length = 0;
                c.remove();
                loadedImages.splice(loadedImages.indexOf(c), 1);
                if (isSortingGrid) applyGridSort(loadedImages);
                isDragging = false;
            }
        });
    }

    function endDrag() {
        if (!isDragging) return;

        const cardsToMove = selectedCards.has(card) ? Array.from(selectedCards) : [card];

        if (isSortingGrid) {
            cardsToMove.forEach(c => {
                c.classList.remove('dragging-sort');
                c.style.transform = 'none';
            });

            const orderChanged = originalGridOrderSnapshot.some((c, i) => c !== loadedImages[i]);
            if (orderChanged) {
                undoStack.push({
                    type: 'sort',
                    originalOrder: originalGridOrderSnapshot,
                    newOrder: loadedImages.slice(),
                    oldPositions: originalGridOrderSnapshot.map(c => ({ left: c.style.left, top: c.style.top }))
                });
                redoStack.length = 0;
            }
            applyGridSort(loadedImages);
            originalGridOrderSnapshot.length = 0;
        } else {
            cardsToMove.forEach(c => {
                const orig = originalPositions.get(c);
                if (c.style.left !== `${orig.left}px` || c.style.top !== `${orig.top}px`) {
                    undoStack.push({
                        type: 'move',
                        card: c,
                        left: `${orig.left}px`,
                        top: `${orig.top}px`,
                        newLeft: c.style.left,
                        newTop: c.style.top
                    });
                    redoStack.length = 0;
                }
            });
        }

        isDragging = false;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchend', endDrag);
    }
}

// Resizing
function makeResizable(card, handles) {
    let startX, startY, startW, startH, startL, startT, startAspect;
    let activeHandle;

    handles.forEach(h => {
        h.element.addEventListener('mousedown', startResize);
        h.element.addEventListener('touchstart', startResize, { passive: false });
    });

    function startResize(e) {
        e.stopPropagation();
        e.preventDefault();
        updateZIndex(card);
        activeHandle = e.currentTarget.className.replace('resize-handle ', '');

        startX = e.clientX || e.touches[0].clientX;
        startY = e.clientY || e.touches[0].clientY;
        startW = card.offsetWidth;
        startH = card.offsetHeight;
        startL = parseFloat(card.style.left);
        startT = parseFloat(card.style.top);
        startAspect = card.aspectRatio || (startW / startH);

        document.addEventListener('mousemove', resizeMove);
        document.addEventListener('touchmove', resizeMove, { passive: false });
        document.addEventListener('mouseup', resizeEnd);
        document.addEventListener('touchend', resizeEnd);

        card.initialResizeState = {
            left: card.style.left,
            top: card.style.top,
            width: card.style.width,
            height: card.style.height
        };
    }

    function resizeMove(e) {
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        let deltaX = clientX - startX;
        let deltaY = clientY - startY;

        let newW = startW;
        let newH = startH;
        let newL = startL;
        let newT = startT;

        const isNorth = activeHandle.includes('n');
        const isSouth = activeHandle.includes('s');
        const isWest = activeHandle.includes('w');
        const isEast = activeHandle.includes('e');

        if (isNorth) {
            newH = startH - deltaY;
            if (newH < MIN_SIZE) {
                newH = MIN_SIZE;
                deltaY = startH - MIN_SIZE;
            }
            newW = newH * startAspect;
            newL = startL + (startW - newW) * (isEast ? 0 : 1);
            newT = startT + deltaY;
        }
        else if (isSouth) {
            newH = startH + deltaY;
            if (newH < MIN_SIZE) {
                newH = MIN_SIZE;
                deltaY = MIN_SIZE - startH;
            }
            newW = newH * startAspect;
            newL = startL + (startW - newW) * (isEast ? 0 : 1);
            newT = startT;
        }
        else if (isEast) {
            newW = startW + deltaX;
            if (newW < MIN_SIZE) {
                newW = MIN_SIZE;
                deltaX = MIN_SIZE - startW;
            }
            newH = newW / startAspect;
            newT = startT + (startH - newH) * (isSouth ? 0 : 1);
        }
        else if (isWest) {
            newW = startW - deltaX;
            if (newW < MIN_SIZE) {
                newW = MIN_SIZE;
                deltaX = startW - MIN_SIZE;
            }
            newH = newW / startAspect;
            newT = startT + (startH - newH) * (isSouth ? 0 : 1);
            newL = startL + deltaX;
        }

        card.style.left = `${newL}px`;
        card.style.top = `${newT}px`;
        card.style.width = `${newW}px`;
        card.style.height = `${newH}px`;
        card.resized = true;
        card.keepSize = true;

        if (demensVisible) {
            updateDimensionsLabel(card, newW, newH);
        }
    }

    function resizeEnd() {
        document.removeEventListener('mousemove', resizeMove);
        document.removeEventListener('touchmove', resizeMove);
        document.removeEventListener('mouseup', resizeEnd);
        document.removeEventListener('touchend', resizeEnd);

        if (card.initialResizeState && card.initialResizeState.width !== card.style.width) {
            undoStack.push({
                type: 'resize',
                card,
                left: card.initialResizeState.left,
                top: card.initialResizeState.top,
                width: card.initialResizeState.width,
                height: card.initialResizeState.height
            });
            redoStack.length = 0;
        }
        delete card.initialResizeState;
        card.keepSize = true;
        activeHandle = null;
    }
}

// UNDO / REDO
function undoLastAction() {
    if (!undoStack.length) return;
    const action = undoStack.pop();
    redoStack.push(action);

    switch (action.type) {
        case 'remove': {
            gallery.appendChild(action.card);
            const idx = action.index ?? loadedImages.length;
            loadedImages.splice(idx, 0, action.card);
            updateZIndex(action.card);
            break;
        }
        case 'add': {
            action.cards.forEach(c => {
                if (c.parentNode) c.parentNode.removeChild(c);
                const idx = loadedImages.indexOf(c);
                if (idx !== -1) loadedImages.splice(idx, 1);
            });
            break;
        }
        case 'eraseWall': {
            const ws = action.wallState;

            document.getElementById("wallWidthInput").value = ws.width;
            document.getElementById("wallHeightInput").value = ws.height;
            document.getElementById("wallUnit").value = ws.unit;

            mockWall.style.display = ws.visible ? "block" : "none";
            mockWall.style.backgroundColor = ws.color || "#f0f0f0";

            updateWallScale();

            if (ws.hang) {
                document.getElementById("hangHeightInput").value = ws.hang.value;
                document.getElementById("hangHeightUnit").value = ws.hang.unit;
                document.getElementById("hangHeightToggle").checked = ws.hang.enabled;
                setHangHeight();
                if (!ws.hang.enabled && hangLine) hangLine.style.display = "none";
            }

            document.getElementById("hangHeightContainer").style.display = 'block';
            break;
        }
        case 'removeAll': {
            action.cards.forEach(c => {
                gallery.appendChild(c);
                loadedImages.push(c);
                updateZIndex(c);
            });
            break;
        }
        case 'snapgrid': {
            (action.snapshot || []).forEach(item => {
                const c = item.card;
                c.style.left   = item.left;
                c.style.top    = item.top;
                c.style.width  = item.width;
                c.style.height = item.height;
                if (item.zIndex) c.style.zIndex = item.zIndex;

                updateDimensionsLabel(
                    c,
                    parseFloat(item.width),
                    parseFloat(item.height)
                );

                const infoWrapper = c.querySelector('.info-wrapper');
                const dimLabel = c.querySelector('.dim-label');
                if (dimLabel && infoWrapper && dimLabel.parentNode !== infoWrapper) {
                    infoWrapper.appendChild(dimLabel);
                }
            });
            break;
        }
        case 'resize': {
            if (action.card) {
                action.card.style.left   = action.left;
                action.card.style.top    = action.top;
                action.card.style.width  = action.width;
                action.card.style.height = action.height;

                updateDimensionsLabel(
                    action.card,
                    parseFloat(action.width),
                    parseFloat(action.height)
                );

                const infoWrapper = action.card.querySelector('.info-wrapper');
                const dimLabel = action.card.querySelector('.dim-label');
                if (dimLabel && infoWrapper && dimLabel.parentNode !== infoWrapper) {
                    infoWrapper.appendChild(dimLabel);
                }
            }
            break;
        }
        case 'move': {
            if (action.card) {
                action.card.style.left = action.left;
                action.card.style.top  = action.top;
            }
            break;
        }
        case 'sort': {
            loadedImages.length = 0;
            loadedImages.push(...action.originalOrder);

            action.originalOrder.forEach((c, i) => {
                c.style.left = action.oldPositions[i].left;
                c.style.top  = action.oldPositions[i].top;

                const infoWrapper = c.querySelector('.info-wrapper');
                const dimLabel = c.querySelector('.dim-label');
                if (dimLabel && infoWrapper && dimLabel.parentNode !== infoWrapper) {
                    infoWrapper.appendChild(dimLabel);
                }
            });

            applyGridSort(loadedImages);
            break;
        }
        case 'frameAdd': {
            const card = action.card;
            card.isFramedUpload = false;
            card.matteValue = action.prevState.matte;
            card.frameValue = action.prevState.frame;
            card.frameUnit = action.prevState.unit;
            card.frameColor = action.prevState.color;
            applyFrameToCard(card); // this will effectively clear frame if prev was null
            break;
        }
    }
}

function redoLastAction() {
    if (!redoStack.length) return;
    const action = redoStack.pop();
    undoStack.push(action);

    switch (action.type) {
        case 'remove': {
            if (action.card.parentNode) action.card.parentNode.removeChild(action.card);
            const idx = loadedImages.indexOf(action.card);
            if (idx !== -1) loadedImages.splice(idx, 1);
            break;
        }
        case 'add': {
            action.cards.forEach(c => {
                gallery.appendChild(c);
                loadedImages.push(c);
                updateZIndex(c);
            });
            break;
        }
        case 'removeAll': {
            action.cards.forEach(c => {
                if (c.parentNode) c.parentNode.removeChild(c);
                const idx = loadedImages.indexOf(c);
                if (idx !== -1) loadedImages.splice(idx, 1);
            });
            break;
        }
        case 'snapgrid': {
            (action.snapshot || []).forEach(item => {
                const c = item.card;
                c.style.left   = item.left;
                c.style.top    = item.top;
                c.style.width  = item.width;
                c.style.height = item.height;
                if (item.zIndex) c.style.zIndex = item.zIndex;

                updateDimensionsLabel(
                    c,
                    parseFloat(item.width),
                    parseFloat(item.height)
                );
            });
            break;
        }
        case 'resize': {
            if (action.card) {
                action.card.style.left   = action.newLeft;
                action.card.style.top    = action.newTop;
                action.card.style.width  = action.width;
                action.card.style.height = action.height;

                updateDimensionsLabel(
                    action.card,
                    parseFloat(action.width),
                    parseFloat(action.height)
                );
            }
            break;
        }
        case 'move': {
            if (action.card) {
                action.card.style.left = action.newLeft;
                action.card.style.top  = action.newTop;
            }
            break;
        }
        case 'sort': {
            loadedImages.length = 0;
            loadedImages.push(...action.newOrder);

            action.newOrder.forEach((c, i) => {
                c.style.left = action.newOrder[i].style.left;
                c.style.top  = action.newOrder[i].style.top;
            });

            applyGridSort(loadedImages);
            break;
        }
        case 'frameAdd': {
            const card = action.card;
            card.isFramedUpload = true;
            card.matteValue = action.newState.matte;
            card.frameValue = action.newState.frame;
            card.frameUnit  = action.newState.unit;
            card.frameColor = action.newState.color;
            applyFrameToCard(card);
            break;
        }
    }
}

// INLINE EDITING
let demensVisible = false;
const PX_PER_INCH = 96;
const CM_PER_INCH = 2.54;

function startInlineEdit(e, card) {
    e.stopPropagation();

    if (mockWall.style.display === 'none') {
        alert('Please set the wall dimensions first to enable size editing.');
        return;
    }

    const dimLabel = e.currentTarget;
    if (dimLabel.querySelector('input')) return;

    const currentWidthFt = (card.offsetWidth / scaleFactor);
    const currentUnit = wallUnit;

    let currentPrimaryWidth;
    if (currentUnit === 'ft' || currentUnit === 'in') {
        currentPrimaryWidth = currentWidthFt * 12;
    } else {
        currentPrimaryWidth = currentWidthFt * 30.48;
    }

    const inputBox = document.createElement('input');
    inputBox.type = 'number';
    inputBox.step = 'any';
    inputBox.value = currentPrimaryWidth.toFixed(2);
    inputBox.style.width = '70px';

    const oldLeft = card.style.left;
    const oldTop = card.style.top;
    const oldWidth = card.style.width;
    const oldHeight = card.style.height;

    const finishEdit = (applyChange) => {
        if (applyChange) {
            const newWidthReal = parseFloat(inputBox.value);

            if (isNaN(newWidthReal) || newWidthReal <= 0) {
                updateDimensionsLabel(card,
                    parseFloat(card.style.width),
                    parseFloat(card.style.height)
                );
                return;
            }

            const newWidthFt = newWidthReal / 12;
            const aspectRatio = card.aspectRatio || (card.offsetWidth / card.offsetHeight);
            const newWidthPx = newWidthFt * scaleFactor;
            const newHeightPx = newWidthPx / aspectRatio;

            if (newWidthPx !== parseFloat(card.style.width)) {
                card.style.width = `${newWidthPx}px`;
                card.style.height = `${newHeightPx}px`;
                card.resized = true;

                undoStack.push({
                    type: 'resize',
                    card,
                    left: oldLeft,
                    top: oldTop,
                    width: oldWidth,
                    height: oldHeight
                });
                redoStack.length = 0;
            }

            updateDimensionsLabel(
                card,
                parseFloat(card.style.width),
                parseFloat(card.style.height)
            );

            dimLabel.classList.remove('editing');
            dimLabel.style.textDecoration = 'underline';
            dimLabel.style.cursor = 'pointer';
            inputBox.remove();
        } else {
            updateDimensionsLabel(
                card,
                parseFloat(card.style.width),
                parseFloat(card.style.height)
            );
        }
        dimLabel.classList.remove('editing');
        dimLabel.style.textDecoration = 'underline';
        dimLabel.style.cursor = 'pointer';
        dimLabel.removeEventListener('click', finishEdit);
    };

    dimLabel.originalText = dimLabel.textContent;
    dimLabel.textContent = `New Width:`;
    dimLabel.appendChild(inputBox);
    inputBox.focus();
    inputBox.select();
    dimLabel.classList.add('editing');
    dimLabel.style.textDecoration = 'none';
    dimLabel.style.cursor = 'default';

    inputBox.addEventListener('blur', () => finishEdit(true));
    inputBox.addEventListener('keydown', (e2) => {
        if (e2.key === 'Enter') {
            e2.preventDefault();
            finishEdit(true);
        } else if (e2.key === 'Escape') {
            finishEdit(false);
        }
    });
}

function updateDimensionsLabel(card, widthPx, heightPx) {
    let dimLabel = card.querySelector('.dim-label');
    const infoWrapper = card.querySelector('.info-wrapper');
    if (dimLabel && infoWrapper && dimLabel.parentNode !== infoWrapper) {
        infoWrapper.appendChild(dimLabel);
    }
    if (!dimLabel || dimLabel.classList.contains('editing')) return;

    const frameUnit = document.getElementById('frameUnitMaster').value;
    const printInMetric = (frameUnit === "cm" || wallUnit === "m");

    // --- Base print dimensions (feet) ---
    const printWidthFt  = widthPx  / scaleFactor;
    const printHeightFt = heightPx / scaleFactor;

    // Convert print size depending on mode
    let text = "";

    if (printInMetric) {
        // 🌟 PRINT SIZE IN CM
        const printWidthCm  = printWidthFt  * 30.48;
        const printHeightCm = printHeightFt * 30.48;
        text += `${printWidthCm.toFixed(0)} cm × ${printHeightCm.toFixed(0)} cm print\n`;
    } else {
        // 🌟 PRINT SIZE IN INCHES
        const printWidthIn  = printWidthFt  * 12;
        const printHeightIn = printHeightFt * 12;
        text += `${printWidthIn.toFixed(0)}" × ${printHeightIn.toFixed(0)}" print\n`;
    }

    // --- Per-card frame/matte values ---
    const matteValue = card.matteValue || 0;
    const frameValue = card.frameValue || 0;
    const unit = frameUnit; // display unit

    const matteFt = convertToFeet(matteValue, unit);
    const frameFt = convertToFeet(frameValue, unit);
    const borderFt = matteFt + frameFt;

    const framedWidthFt  = printWidthFt  + borderFt * 2;
    const framedHeightFt = printHeightFt + borderFt * 2;

// --- FRAMED SIZE ---
// If the wall is in meters OR the frame unit is cm → show framed size in cm
if (wallUnit === "m" || frameUnit === "cm") {
    const fwCm = framedWidthFt * 30.48;
    const fhCm = framedHeightFt * 30.48;
    text += `${fwCm.toFixed(0)} cm × ${fhCm.toFixed(0)} cm framed`;
} 
// Otherwise → inches
else {
    const fwIn = framedWidthFt * 12;
    const fhIn = framedHeightFt * 12;
    text += `${fwIn.toFixed(0)}" × ${fhIn.toFixed(0)}" framed`;
}
    dimLabel.textContent = text;
    dimLabel.style.display = demensVisible ? 'block' : 'none';
}

// Snap button as positioning context
const snapBtn = document.getElementById('snapGridBtn');
if (snapBtn) snapBtn.style.position = 'relative';

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    const key   = (e.key || '').toLowerCase();
    const isCmd = e.metaKey || e.ctrlKey;

    if (isCmd && e.shiftKey && key === 'z') {
        e.preventDefault();
        redoLastAction();
        return;
    }

    if (isCmd && !e.shiftKey && key === 'y') {
        e.preventDefault();
        redoLastAction();
        return;
    }

    if (isCmd && !e.shiftKey && key === 'z') {
        e.preventDefault();
        undoLastAction();
        return;
    }

    if (isCmd && key === 's') {
        e.preventDefault();
        document.getElementById('saveLayoutBtn')?.click();
        return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();

        const cardsToRemove = selectedCards.size
            ? [...selectedCards]
            : [...loadedImages].slice(-1);

        cardsToRemove.forEach(card => {
            undoStack.push({
                type: 'remove',
                card,
                index: loadedImages.indexOf(card)
            });
            redoStack.length = 0;

            card.remove();
            loadedImages.splice(loadedImages.indexOf(card), 1);
            selectedCards.delete(card);
        });

        if (isSortingGrid) snapToGrid(true);
        return;
    }

    if (key === 's' || e.code === 'Space') {
        e.preventDefault();
        document.getElementById('snapGridBtn')?.click();
        return;
    }

    if (key === 'd') {
        e.preventDefault();
        document.getElementById('toggleDemensBtn')?.click();
        return;
    }

    if (key === 'n') {
        e.preventDefault();
        document.getElementById('toggleNamesBtn')?.click();
        return;
    }

    if (key === 'l') {
        e.preventDefault();
        document.getElementById('toggleLockBtn')?.click();
        return;
    }
});

// Lock icons
const lockedSVG = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <title>Locked</title>
    <rect x="4" y="10" width="16" height="10" rx="2"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
  </svg>
`;

const unlockedSVG = `
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" 
       stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <title>Unlocked</title>
    <rect x="4" y="10" width="16" height="10" rx="2"/>
    <path d="M16 10V6a4 4 0 0 0-8 0"/>
  </svg>
`;

function toggleLock() {
  isSortingGrid = !isSortingGrid;

  if (isSortingGrid) {
    lockButton.innerHTML = lockedSVG;
    lockButton.title = 'Locked: Drag to sort grid';
    lockButton.setAttribute('aria-pressed', 'true');
    snapToGrid(true);
  } else {
    lockButton.innerHTML = unlockedSVG;
    lockButton.title = 'Unlocked: Drag freely';
    lockButton.setAttribute('aria-pressed', 'false');
  }
}

function createLockButton() {
    lockButton = document.getElementById("toggleLockBtn");

    // initial state: unlocked
    lockButton.innerHTML = unlockedSVG;
    lockButton.title = 'Unlocked: Drag freely';
    lockButton.setAttribute('aria-pressed', 'false');

    lockButton.addEventListener('click', toggleLock);
}

// Basic buttons
document.getElementById('add1Btn').addEventListener('click', () => addImages(1));
document.getElementById('add5Btn').addEventListener('click', () => addImages(5));
document.getElementById('eraseAllBtn').addEventListener('click', eraseAll);
document.getElementById("eraseAllBtn").addEventListener("click", () => {
    // Hide the wall
    mockWall.style.display = "none";

    // Remove hang line
    if (hangLine) {
        hangLine.remove();
        hangLine = null;
        hangLineLabel = null;
    }
});


document.getElementById('snapGridBtn').addEventListener('click', () => snapToGrid(true));

document.getElementById('toggleNamesBtn').addEventListener('click', () => {
    namesVisible = !namesVisible;
    loadedImages.forEach(card => {
        const meta = card.querySelector('.metadata');
        if (meta) meta.style.display = namesVisible ? 'block' : 'none';
    });
});

document.getElementById('toggleDemensBtn').addEventListener('click', () => {
    demensVisible = !demensVisible;
    loadedImages.forEach(card => {
        const widthPx = parseFloat(card.style.width);
        const heightPx = parseFloat(card.style.height);
        updateDimensionsLabel(card, widthPx, heightPx);
    });
});

document.getElementById('undoBtn').addEventListener('click', undoLastAction);

// FRAME HELPERS
function convertToFeet(value, unit) {
    if (unit === 'ft') return value;
    if (unit === 'in') return value / 12;
    if (unit === 'cm') return value / 30.48;
    return 0;
}

function realToPixels(feet) {
    return feet * scaleFactor;
}

function applyFrameToCard(card) {

    // Only apply frames when the card explicitly HAS a frame
    if (card.isFramedUpload !== true) {
        // Remove any leftover styling
        const wrapper = card.querySelector(".frame-wrapper");
        wrapper.style.boxShadow = "none";
        wrapper.style.marginBottom = "0px";
        return;
    }

    // Retrieve saved values DIRECTLY — never fall back to global UI values
    const matteValue = (card.matteValue !== undefined) ? card.matteValue : 0;
    const frameValue = (card.frameValue !== undefined) ? card.frameValue : 0;
    const unit       = card.frameUnit  || "in";   // safe default
    const color      = card.frameColor || "#000"; // safe default

    card.matteValue = matteValue;
    card.frameValue = frameValue;
    card.frameUnit  = unit;
    card.frameColor = color;

    // convert to pixels
    const matteFeet  = convertToFeet(matteValue, unit);
    const frameFeet  = convertToFeet(frameValue, unit);
    const effectiveScale = (mockWall.style.display === "none") ? 4 : scaleFactor;

    const mattePx = matteFeet * effectiveScale;
    const framePx = frameFeet * effectiveScale;

    const wrapper = card.querySelector(".frame-wrapper");

    wrapper.style.boxShadow =
        `0 0 0 ${mattePx}px white,
         0 0 0 ${mattePx + framePx}px ${color}`;

    wrapper.style.marginBottom = `${mattePx + framePx}px`;
}

// Only the unit should update all framed cards globally
document.getElementById("frameUnitMaster").addEventListener("input", () => {
    const newUnit = document.getElementById("frameUnitMaster").value;
    liveFrameSettings.unit = newUnit;

    loadedImages
        .filter(card => card.isFramedUpload)
        .forEach(card => {
            // Only update the unit — NOT thicknesses
            card.frameUnit = newUnit;

            applyFrameToCard(card);
            updateDimensionsLabel(card,
                parseFloat(card.style.width),
                parseFloat(card.style.height)
            );
        });
});

// Matte + frame input only update the preview / next drag
document.getElementById("matteInput").addEventListener("input", () => {
    liveFrameSettings.matte = parseFloat(document.getElementById("matteInput").value) || 0;
});
document.getElementById("frameInput").addEventListener("input", () => {
    liveFrameSettings.frame = parseFloat(document.getElementById("frameInput").value) || 0;
});

// === SIMPLE, RELIABLE, SAFARI-SAFE COLOR PICKER ===
const frameColorBtn = document.getElementById("frameColorBtn");

// create hidden <input type="color"> (Safari requires visibility + size)
let framePicker = document.getElementById("frameColorPicker");
if (!framePicker) {
    framePicker = document.createElement("input");
    framePicker.type = "color";
    framePicker.id = "frameColorPicker";

framePicker.style.position = "absolute";
framePicker.style.opacity = "0";
framePicker.style.width = "40px";
framePicker.style.height = "40px";
framePicker.style.left = "250px";     // ← not off-screen
framePicker.style.top = "100px";      // ← not off-screen
    document.body.appendChild(framePicker);
}

// initial button color
frameColorBtn.style.backgroundColor = frameColor;
frameColorBtn.style.setProperty("--frame-color", frameColor);

// clicking the circle opens the picker
frameColorBtn.addEventListener("click", () => {
    framePicker.click();     // ← Safari OK now
});

// picker change → update global & preview button
framePicker.addEventListener("input", e => {
    frameColor = e.target.value;
    liveFrameSettings.color = frameColor;
    frameColorBtn.style.setProperty("--frame-color", frameColor);
 
});


function reapplyFrameToAll() {
    loadedImages.forEach(card => {
        if (card.isFramedUpload === true) {
            applyFrameToCard(card);
        } else {
            // ensure unframed cards are clean
            const w = card.querySelector(".frame-wrapper");
            if (w) {
                w.style.boxShadow = "none";
                w.style.marginBottom = "0px";
            }
        }
    });
}

// Upload images (regular)
uploadInput.addEventListener('change', e => {
    const files = Array.from(e.target.files);
    const addedCards = [];
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
            const img = new Image();
            img.onload = () => {
                const MAX_SIDE = 1000;
                let width = img.naturalWidth;
                let height = img.naturalHeight;
                const longer = Math.max(width, height);
                if (longer > MAX_SIDE) {
                    const scale = MAX_SIDE / longer;
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                const dataURL = canvas.toDataURL('image/jpeg', 0.92);
                const card = createImageCard(dataURL, file.name.replace(/\.[^/.]+$/, ""));
                addedCards.push(card);
// FIX: Make uploaded images track frame settings
card.isFramedUpload = true;
card.matteValue = parseFloat(document.getElementById("matteInput").value) || 0;
card.frameValue = parseFloat(document.getElementById("frameInput").value) || 0;
card.frameUnit  = document.getElementById("frameUnitMaster").value;
card.frameColor = frameColor;

applyFrameToCard(card);

                if (addedCards.length === files.length) {
                    undoStack.push({ type: 'add', cards: addedCards });
                    redoStack.length = 0;
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
});

/* WALL + HANG HEIGHT */

let wallWidthReal = 10;
let wallHeightReal = 8;
let wallUnit = 'ft';
let scaleFactor = 10;

const mockWall = document.createElement('div');
mockWall.id = 'mockWall';
mockWall.style.display = 'none';
document.body.appendChild(mockWall);

function updateWallScale() {
    if (suppressWallUpdate) return;
    let wInput = document.getElementById('wallWidthInput').value;
    let hInput = document.getElementById('wallHeightInput').value;
    wallUnit = document.getElementById('wallUnit').value;

    // Default values for the wall if no dimensions are provided
    if (!wInput || !hInput || isNaN(parseFloat(wInput)) || isNaN(parseFloat(hInput))) {
        wallWidthReal = 12;
        wallHeightReal = 10;
        wallUnit = 'ft';

        // Update the inputs visually too
        document.getElementById('wallWidthInput').value = 12;
        document.getElementById('wallHeightInput').value = 10;
        document.getElementById('wallUnit').value = 'ft';
    } else {
        wallWidthReal = parseFloat(wInput);
        wallHeightReal = parseFloat(hInput);
    }

    // Hiding the wall initially
    mockWall.style.display = 'none';

// --- viewport-safe usable area ---
const LEFT_UI = 300;      // side panel + small breathing room
const RIGHT_MARGIN = 40;  // margin so labels don't clip right edge
const availableHeight = window.innerHeight - 40 - 20;

const availableWidth  = window.innerWidth  - LEFT_UI - RIGHT_MARGIN;

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

    // Show the mock wall and set its dimensions
    mockWall.style.display = 'block';
    mockWall.style.width = `${widthFeet * scaleFactor}px`;
    mockWall.style.height = `${heightFeet * scaleFactor}px`;

    // Show the reset wall button only after the wall is created
resetWallBtn.style.setProperty("display", "inline-flex", "important");

    // Reapply frame settings to all images
    reapplyFrameToAll();

    loadedImages.forEach(card => {
        const widthPx = parseFloat(card.style.width);
        const heightPx = parseFloat(card.style.height);
        updateDimensionsLabel(card, widthPx, heightPx);
    });
updateWallDimensionLines();
applyWallDimensionVisibility();
}

/* ===========================================================
   WALL DIMENSION LINES (BLUE WIDTH + RED HEIGHT)
   =========================================================== */

let wallWidthLine = null;
let wallWidthLabel = null;
let wallHeightLine = null;
let wallHeightLabel = null;

function updateWallDimensionLines() {
    if (mockWall.style.display === "none") return;

    const wallRect = mockWall.getBoundingClientRect();

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

    /* -----------------------------------------------------------
       WIDTH LINE (BLUE) — anchored to bottom of wall
       ----------------------------------------------------------- */
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

    // Convert back to correct unit for label
    let widthLabel;
    if (wallUnit === "m") widthLabel = `${wallWidthReal} m`;
    else if (wallUnit === "in") widthLabel = `${wallWidthReal}"`;
    else widthLabel = `${wallWidthReal} ft`;

    wallWidthLabel.textContent = widthLabel;
    wallWidthLabel.style.top = `${hPx + 12}px`;
    wallWidthLabel.style.left = `${wPx / 2 - 20}px`;


    /* -----------------------------------------------------------
       HEIGHT LINE (RED) — anchored to right side of wall
       ----------------------------------------------------------- */
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

    if (wallWidthLine)  wallWidthLine.style.display  = show;
    if (wallWidthLabel) wallWidthLabel.style.display = show;
    if (wallHeightLine) wallHeightLine.style.display = show;
    if (wallHeightLabel) wallHeightLabel.style.display = show;
}

resetWallBtn.addEventListener("click", () => {
    mockWall.style.display = "none";
    resetWallBtn.style.display = "none";

    // remove hang height line if active
    if (hangLine) {
        hangLine.remove();
        hangLine = null;
        hangLineLabel = null;
    }
});

let hangLine = null;
let hangLineLabel = null;

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
        case 'm':  hFeet = val * 3.28084; break;
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

// GLOBAL SCALE
let globalScale = 1;
let scaleDraggingH = false;
const barH    = document.getElementById('globalScaleBarH');
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
    const barLeft  = rect.left;
    const barWidth = rect.width;

    let mouseX = e.clientX - barLeft;
    mouseX = Math.max(0, Math.min(barWidth, mouseX));

    const clampedLeft = mouseX - (handleH.offsetWidth / 2);
    handleH.style.left = `${Math.max(0, Math.min(clampedLeft, barWidth - handleH.offsetWidth))}px`;

    const pct = mouseX / barWidth;
    globalScale = 0.1 + pct * (4 - 0.1);

    applyGlobalScaleH();
}

function updateHangHeight() {
    if (mockWall.style.display === "none") return;

    const val = parseFloat(document.getElementById('hangHeightInput').value);
    const unit = document.getElementById('hangHeightUnit').value;

    if (!isNaN(val) && val > 0) {
        // reuse existing function
        setHangHeight();
    }
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

// LAYOUT SAVE/LOAD
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

    // ⭐ ADD THIS LINE
    zIndex: card.style.zIndex,

    aspectRatio: card.aspectRatio,
    resized: card.resized || false,
    keepSize: card.keepSize || false,
    isFramedUpload: card.isFramedUpload || false,
    matteValue: card.matteValue ?? null,
    frameValue: card.frameValue ?? null,
    frameUnit:  card.frameUnit  ?? null,
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
            enabled: document.getElementById("hangHeightToggle").checked,
            yPx: hangLine.style.top
        } : null
    };
}

document.getElementById("loadLayoutBtn").addEventListener("click", () => {
    document.getElementById("loadLayoutInput").click();
});

document.getElementById("loadLayoutInput").addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) loadLayoutFile(file);
});

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
    card.frameUnit  = item.frameUnit;
    card.frameColor = item.frameColor;
    card.needsFrameReapply = true;
}

    updateDimensionsLabel(card, parseFloat(item.width), parseFloat(item.height));

    // ⬅️ allow card.onload sizing only for NEW cards
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
        createFrameColorButton();
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
        document.getElementById("hangHeightToggle").checked = layout.hangHeight.enabled;
        setHangHeight();
    }
}

document.getElementById("saveLayoutBtn").addEventListener("click", downloadLayoutFile);

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

fetchCSV();

// Load from URL ?data=...
(function loadFromURL() {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("data");
    if (!encoded) return;

    try {
        const json = atob(encoded);
        const layout = JSON.parse(json);

        layout.cards.forEach(item => {
            let src = item.src;

            if (src.startsWith("local:")) {
                const id = src.replace("local:", "");
                const stored = localStorage.getItem(id);
                if (stored) src = stored;
            }

            const card = createImageCard(src, item.photographer || "");
            const img = card.querySelector("img");

            if (item.src.startsWith("local:")) {
                card.dataset.uploadId = item.src.replace("local:", "");
            }

            function applyRestoredProps() {
                card.style.left = item.left;
                card.style.top = item.top;
                card.style.width = item.width;
                card.style.height = item.height;

                card.aspectRatio = item.aspectRatio;
                card.resized = item.resized;
                card.keepSize = item.keepSize;

card.isFramedUpload = (item.isFramedUpload === true);

if (card.isFramedUpload) {
    card.matteValue = item.matteValue;
    card.frameValue = item.frameValue;
    card.frameUnit  = item.frameUnit;
    card.frameColor = item.frameColor;
    card.needsFrameReapply = true;
}

                updateDimensionsLabel(
                    card,
                    parseFloat(item.width),
                    parseFloat(item.height)
                );
            }

            if (img.complete) {
                applyRestoredProps();
            } else {
                img.addEventListener("load", applyRestoredProps);
            }
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
            const color = (card.frameColor !== null && card.frameColor !== undefined)
    ? card.frameColor
    : null;
            createFrameColorButton();
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
            document.getElementById("hangHeightToggle").checked = layout.hangHeight.enabled;
            setHangHeight();
        }

        console.log("Layout restored from URL.");
    } catch (err) {
        console.error("Load failed:", err);
    }
})();

// MULTI-SELECT MARQUEE
const selectedCards = new Set();
let isMarquee = false;
let startX = 0, startY = 0;
let marqueeEl = null;

gallery.addEventListener('mousedown', e => {
    if (e.target.closest('.image-card') || e.target.closest('button')) return;
    e.preventDefault();

    isMarquee = true;
    startX = e.pageX;
    startY = e.pageY;

    marqueeEl = document.createElement('div');
    Object.assign(marqueeEl.style, {
        position: 'absolute',
        border: '1px dashed #0099ff',
        background: 'rgba(0,153,255,0.1)',
        left: `${startX}px`,
        top: `${startY}px`,
        width: '0px',
        height: '0px',
        zIndex: 9999,
        pointerEvents: 'none'
    });
    document.body.appendChild(marqueeEl);
});

document.addEventListener('mousemove', e => {
    if (!isMarquee) return;

    const x1 = Math.min(e.pageX, startX),
          y1 = Math.min(e.pageY, startY),
          x2 = Math.max(e.pageX, startX),
          y2 = Math.max(e.pageY, startY);

    Object.assign(marqueeEl.style, {
        left: `${x1}px`,
        top: `${y1}px`,
        width: `${x2 - x1}px`,
        height: `${y2 - y1}px`
    });

    loadedImages.forEach(card => {
        const r = card.getBoundingClientRect();
        const cardX1 = r.left + window.scrollX;
        const cardY1 = r.top + window.scrollY;
        const cardX2 = cardX1 + r.width;
        const cardY2 = cardY1 + r.height;

        const intersects = !(cardX2 < x1 || cardX1 > x2 || cardY2 < y1 || cardY1 > y2);

        if (intersects) {
            if (!selectedCards.has(card)) selectedCards.add(card);
        } else if (!(e.shiftKey || e.ctrlKey)) {
            selectedCards.delete(card);
        }
    });

    loadedImages.forEach(card => card.classList.toggle('selected', selectedCards.has(card)));
});

document.addEventListener('mouseup', () => {
    if (isMarquee) {
        isMarquee = false;
        if (marqueeEl) {
            marqueeEl.remove();
            marqueeEl = null;
        }
    }
});

document.addEventListener('mousedown', e => {
    if (!e.target.closest('.image-card')) {
        selectedCards.clear();
        loadedImages.forEach(card => card.classList.remove('selected'));
    }
});

// DRAG FRAME TOOL
let dragFrameActive = false;
let dragGhost = null;

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

    // Toggle visibility
const isVisible = framePopover.style.display === "flex";
framePopover.style.display = isVisible ? "none" : "flex";
frameColorBtn.style.display = isVisible ? "none" : "inline-block";
});

// Hide popover when clicking outside
document.addEventListener("mousedown", (e) => {
    // ❌ If drag frame tool is active → ignore all clicks
    if (dragFrameActive) return;

    // ❌ If clicking an image card → do nothing
    if (e.target.closest(".image-card")) return;

    // ✔ Only close if clicking outside BOTH the popover and frame button
    if (!framePopover.contains(e.target) &&
        !dragFrameBtn.contains(e.target)) {
        framePopover.style.display = "none";
        frameColorBtn.style.display = "none";
    }
});



document.getElementById("dragFrameBtn").addEventListener("click", () => {
    dragFrameActive = true;
    dragGhost.style.display = "block";
    createFrameColorButton();
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
targetCard.frameUnit  = liveFrameSettings.unit;
targetCard.frameColor = liveFrameSettings.color;

    applyFrameToCard(targetCard);
    updateDimensionsLabel(
    targetCard,
    parseFloat(targetCard.style.width),
    parseFloat(targetCard.style.height)
);
    createFrameColorButton();

    undoStack.push({
        type: "frameAdd",
        card: targetCard,
        prevState: {
            matte: null,
            frame: null,
            unit: null,
            color: null
        },
        newState: {
            matte: targetCard.matteValue,
            frame: targetCard.frameValue,
            unit: targetCard.frameUnit,
            color: targetCard.frameColor
        }
    });
    redoStack.length = 0;
});

createLockButton();


/* ===========================================================
   FINAL — SINGLE WALL POPOVER MODULE (no duplicates)
   =========================================================== */

const wallBtn = document.getElementById("setWallBtn");
const wallPopover = document.getElementById("wallPopover");
const wallColorBtn = document.getElementById("wallColorBtn");

/* --- Hidden Safari-safe input --- */
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

/* === BUILD WALL on second click (first click = open popover) === */
let wallPopoverOpen = false;

wallBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // SECOND CLICK → build wall
    if (wallPopoverOpen) {
        wallPopoverOpen = false;
        wallPopover.style.display = "none";

        updateWallScale();
        createPaintBucketTool();
mockWall.style.display = "block";
resetWallBtn.style.display = "inline-flex";
console.log("Erasure button displayed:", resetWallBtn.style.display);

        return;
    }

    // FIRST CLICK → open popover
    wallPopoverOpen = true;
    wallPopover.style.display = "flex";
});



/* --- Close on outside click --- */
document.addEventListener("mousedown", (e) => {
    if (!wallPopover.contains(e.target) &&
        !wallBtn.contains(e.target)) {
        wallPopover.style.display = "none";
    }
});

/* --- Color picker --- */
wallColorBtn.addEventListener("click", () => {
    wallColorPicker.click();
});

wallColorPicker.addEventListener("input", (e) => {
    const c = e.target.value;
    wallColorBtn.style.setProperty("--wall-color", c);
    mockWall.style.backgroundColor = c;
});



// INFO POPUP — Safari-safe (attach after load)
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

/* ===========================================================
   HANG HEIGHT POPOVER — matches wall popover behavior
   =========================================================== */

const hhBtn = document.getElementById("hangHeightBtn");
const hhPopover = document.getElementById("hangHeightPopover");
const hhInput = document.getElementById("hangHeightInput");
const hhUnit = document.getElementById("hangHeightUnit");

let hhOpen = false;

// OPEN/CLOSE like wall popover
hhBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const val = parseFloat(hhInput.value);
    const hasValue = !isNaN(val) && val > 0;

    // CASE 1 — hang value already set → toggle hang line OFF
    if (hasValue && hangLine && !hhOpen) {
        // turn OFF hang height
        hangLine.remove();
        hangLine = null;
        hangLineLabel = null;

        // hide popover if it was open somehow
        hhPopover.style.display = "none";
        hhOpen = false;

        // also toggle wall dims
        wallDimensionsVisible = !wallDimensionsVisible;
        applyWallDimensionVisibility();

        return;
    }

    // CASE 2 — normal open/close behavior
    hhOpen = !hhOpen;
    hhPopover.style.display = hhOpen ? "flex" : "none";

    if (hhOpen) {
        updateHangHeight();  // apply or update line
    }

    // toggle wall dims every time button is clicked
    wallDimensionsVisible = !wallDimensionsVisible;
    applyWallDimensionVisibility();
});



// close when clicking outside
document.addEventListener("mousedown", (e) => {
    if (!hhPopover.contains(e.target) &&
        !hhBtn.contains(e.target)) {
        hhPopover.style.display = "none";
        hhOpen = false;
    }
});

// update hang line on input change
hhInput.addEventListener("input", updateHangHeight);
hhUnit.addEventListener("change", updateHangHeight);

window.addEventListener("resize", updateWallDimensionLines);
