// ============================================
// GRID-UI.JS - Grid, Dimensions, UI Controls
// ============================================

// GRID LAYOUT
function applyGridSort(imagesArray) {
    const galleryWidth = gallery.clientWidth;

    const gutter = 60;
    const rowSpacing = 80; 
    const startX = leftOffset;
    const startY = 110;

    let x = startX;
    let y = startY;
    let maxRowHeight = 0;

    imagesArray.forEach(card => {
        let width = parseFloat(card.style.width) || (window.innerWidth < 768 ? 130 : 220);
        let height = parseFloat(card.style.height) || (width / (card.aspectRatio || 1.5));

        if (!card.keepSize && !card.resized) {
            const aspect = card.aspectRatio || (width / height) || 1.5;
            width = window.innerWidth < 768 ? 130 : 220;
            height = width / aspect;
        }

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

function snapToGrid(forceSnap = false) {
    if (!loadedImages.length) return;
    if (!isSortingGrid && !forceSnap) return;

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

// DIMENSIONS
function updateDimensionsLabel(card, widthPx, heightPx) {
    let dimLabel = card.querySelector('.dim-label');
    const infoWrapper = card.querySelector('.info-wrapper');
    if (dimLabel && infoWrapper && dimLabel.parentNode !== infoWrapper) {
        infoWrapper.appendChild(dimLabel);
    }
    if (!dimLabel || dimLabel.classList.contains('editing')) return;

    const frameUnit = document.getElementById('frameUnitMaster').value;
    const printInMetric = (frameUnit === "cm" || wallUnit === "m");

    const printWidthFt = widthPx / scaleFactor;
    const printHeightFt = heightPx / scaleFactor;

    let text = "";

    if (printInMetric) {
        const printWidthCm = printWidthFt * 30.48;
        const printHeightCm = printHeightFt * 30.48;
        text += `${printWidthCm.toFixed(0)} cm × ${printHeightCm.toFixed(0)} cm print\n`;
    } else {
        const printWidthIn = printWidthFt * 12;
        const printHeightIn = printHeightFt * 12;
        text += `${printWidthIn.toFixed(0)}" × ${printHeightIn.toFixed(0)}" print\n`;
    }

    const matteValue = card.matteValue || 0;
    const frameValue = card.frameValue || 0;
    const unit = frameUnit;

    const matteFt = convertToFeet(matteValue, unit);
    const frameFt = convertToFeet(frameValue, unit);
    const borderFt = matteFt + frameFt;

    const framedWidthFt = printWidthFt + borderFt * 2;
    const framedHeightFt = printHeightFt + borderFt * 2;

    if (wallUnit === "m" || frameUnit === "cm") {
        const fwCm = framedWidthFt * 30.48;
        const fhCm = framedHeightFt * 30.48;
        text += `${fwCm.toFixed(0)} cm × ${fhCm.toFixed(0)} cm framed`;
    } else {
        const fwIn = framedWidthFt * 12;
        const fhIn = framedHeightFt * 12;
        text += `${fwIn.toFixed(0)}" × ${fhIn.toFixed(0)}" framed`;
    }
    
    dimLabel.textContent = text;
    dimLabel.style.display = demensVisible ? 'block' : 'none';
}

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

// UNDO/REDO
function undoLastAction() {
    if (!undoStack.length) return;
    const action = undoStack.pop();
    redoStack.push(action);

    switch (action.type) {
        case 'remove':
            gallery.appendChild(action.card);
            const idx = action.index ?? loadedImages.length;
            loadedImages.splice(idx, 0, action.card);
            updateZIndex(action.card);
            break;
        case 'add':
            action.cards.forEach(c => {
                if (c.parentNode) c.parentNode.removeChild(c);
                const idx = loadedImages.indexOf(c);
                if (idx !== -1) loadedImages.splice(idx, 1);
            });
            break;
        case 'removeAll':
            action.cards.forEach(c => {
                gallery.appendChild(c);
                loadedImages.push(c);
                updateZIndex(c);
            });
            break;
        case 'snapgrid':
            (action.snapshot || []).forEach(item => {
                const c = item.card;
                c.style.left = item.left;
                c.style.top = item.top;
                c.style.width = item.width;
                c.style.height = item.height;
                if (item.zIndex) c.style.zIndex = item.zIndex;
                updateDimensionsLabel(c, parseFloat(item.width), parseFloat(item.height));
            });
            break;
        case 'resize':
            if (action.card) {
                action.card.style.left = action.left;
                action.card.style.top = action.top;
                action.card.style.width = action.width;
                action.card.style.height = action.height;
                updateDimensionsLabel(action.card, parseFloat(action.width), parseFloat(action.height));
            }
            break;
        case 'move':
            if (action.card) {
                action.card.style.left = action.left;
                action.card.style.top = action.top;
            }
            break;
        case 'sort':
            loadedImages.length = 0;
            loadedImages.push(...action.originalOrder);
            action.originalOrder.forEach((c, i) => {
                c.style.left = action.oldPositions[i].left;
                c.style.top = action.oldPositions[i].top;
            });
            applyGridSort(loadedImages);
            break;
        case 'frameAdd':
            const card = action.card;
            card.isFramedUpload = false;
            card.matteValue = action.prevState.matte;
            card.frameValue = action.prevState.frame;
            card.frameUnit = action.prevState.unit;
            card.frameColor = action.prevState.color;
            applyFrameToCard(card);
            break;
    }
}

function redoLastAction() {
    if (!redoStack.length) return;
    const action = redoStack.pop();
    undoStack.push(action);

    switch (action.type) {
        case 'remove':
            if (action.card.parentNode) action.card.parentNode.removeChild(action.card);
            const idx = loadedImages.indexOf(action.card);
            if (idx !== -1) loadedImages.splice(idx, 1);
            break;
        case 'add':
            action.cards.forEach(c => {
                gallery.appendChild(c);
                loadedImages.push(c);
                updateZIndex(c);
            });
            break;
        case 'removeAll':
            action.cards.forEach(c => {
                if (c.parentNode) c.parentNode.removeChild(c);
                const idx = loadedImages.indexOf(c);
                if (idx !== -1) loadedImages.splice(idx, 1);
            });
            break;
        case 'snapgrid':
            (action.snapshot || []).forEach(item => {
                const c = item.card;
                c.style.left = item.left;
                c.style.top = item.top;
                c.style.width = item.width;
                c.style.height = item.height;
                if (item.zIndex) c.style.zIndex = item.zIndex;
                updateDimensionsLabel(c, parseFloat(item.width), parseFloat(item.height));
            });
            break;
        case 'resize':
            if (action.card) {
                action.card.style.left = action.newLeft;
                action.card.style.top = action.newTop;
                action.card.style.width = action.width;
                action.card.style.height = action.height;
                updateDimensionsLabel(action.card, parseFloat(action.width), parseFloat(action.height));
            }
            break;
        case 'move':
            if (action.card) {
                action.card.style.left = action.newLeft;
                action.card.style.top = action.newTop;
            }
            break;
        case 'sort':
            loadedImages.length = 0;
            loadedImages.push(...action.newOrder);
            action.newOrder.forEach((c, i) => {
                c.style.left = action.newOrder[i].style.left;
                c.style.top = action.newOrder[i].style.top;
            });
            applyGridSort(loadedImages);
            break;
        case 'frameAdd':
            const card = action.card;
            card.isFramedUpload = true;
            card.matteValue = action.newState.matte;
            card.frameValue = action.newState.frame;
            card.frameUnit = action.newState.unit;
            card.frameColor = action.newState.color;
            applyFrameToCard(card);
            break;
    }
}

// LOCK BUTTON
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
    lockButton.innerHTML = unlockedSVG;
    lockButton.title = 'Unlocked: Drag freely';
    lockButton.setAttribute('aria-pressed', 'false');
    lockButton.addEventListener('click', toggleLock);
}

// MULTI-SELECT MARQUEE
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

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', e => {
    const key = (e.key || '').toLowerCase();
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

// BUTTON EVENT LISTENERS
document.getElementById('add1Btn').addEventListener('click', () => addImages(1));
document.getElementById('add5Btn').addEventListener('click', () => addImages(5));
document.getElementById('eraseAllBtn').addEventListener('click', eraseAll);
document.getElementById("eraseAllBtn").addEventListener("click", () => {
    mockWall.style.display = "none";
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
document.getElementById('redoBtn').addEventListener('click', redoLastAction);

// Initialize
createLockButton();
if (snapBtn) snapBtn.style.position = 'relative';
