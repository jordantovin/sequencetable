// ============================================
// CARDS.JS - Image Card Management
// ============================================

// Create Image Card
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

// Add Images
function addImages(count) {
    const subset = getUniqueRandomImages(count);
    const addedCards = subset.map(img => createImageCard(img.src, img.photographer));

    if (addedCards.length) {
        undoStack.push({ type: 'add', cards: addedCards });
        redoStack.length = 0;
    }
}

// Erase All
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

// Make Draggable (with throttling for performance)
let lastGridUpdate = 0;
const GRID_UPDATE_INTERVAL = 16; // ~60fps

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

        // THROTTLED grid sorting logic
        if (isSortingGrid) {
            const now = Date.now();
            if (now - lastGridUpdate >= GRID_UPDATE_INTERVAL) {
                lastGridUpdate = now;
                
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

                for (let i = 0; i <= currentGrid.length; i++) {
                    const tempArray = [...currentGrid.slice(0, i), mainCard, ...currentGrid.slice(i)];
                    let slotX = startX;
                    let slotY = startY;
                    let maxRowHeight = 0;
                    
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

// Make Resizable
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

// Frame Functions
function applyFrameToCard(card) {
    if (card.isFramedUpload !== true) {
        const wrapper = card.querySelector(".frame-wrapper");
        wrapper.style.boxShadow = "none";
        wrapper.style.marginBottom = "0px";
        return;
    }

    const matteValue = (card.matteValue !== undefined) ? card.matteValue : 0;
    const frameValue = (card.frameValue !== undefined) ? card.frameValue : 0;
    const unit = card.frameUnit || "in";
    const color = card.frameColor || "#000";

    card.matteValue = matteValue;
    card.frameValue = frameValue;
    card.frameUnit = unit;
    card.frameColor = color;

    const matteFeet = convertToFeet(matteValue, unit);
    const frameFeet = convertToFeet(frameValue, unit);
    const effectiveScale = (mockWall.style.display === "none") ? 4 : scaleFactor;

    const mattePx = matteFeet * effectiveScale;
    const framePx = frameFeet * effectiveScale;

    const wrapper = card.querySelector(".frame-wrapper");

    wrapper.style.boxShadow =
        `0 0 0 ${mattePx}px white,
         0 0 0 ${mattePx + framePx}px ${color}`;

    wrapper.style.marginBottom = `${mattePx + framePx}px`;
}

function reapplyFrameToAll() {
    loadedImages.forEach(card => {
        if (card.isFramedUpload === true) {
            applyFrameToCard(card);
        } else {
            const w = card.querySelector(".frame-wrapper");
            if (w) {
                w.style.boxShadow = "none";
                w.style.marginBottom = "0px";
            }
        }
    });
}

// Upload Handler
uploadBtn.addEventListener('click', () => uploadInput.click());

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

                card.isFramedUpload = true;
                card.matteValue = parseFloat(document.getElementById("matteInput").value) || 0;
                card.frameValue = parseFloat(document.getElementById("frameInput").value) || 0;
                card.frameUnit = document.getElementById("frameUnitMaster").value;
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
