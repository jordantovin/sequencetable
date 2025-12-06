// ============================================
// UTILS.JS - Helper Functions & Data Loading
// ============================================

// Update z-index
function updateZIndex(element) {
    zIndexCounter++;
    element.style.zIndex = zIndexCounter;
}

// Unit Conversions
function convertToFeet(value, unit) {
    if (unit === 'ft') return value;
    if (unit === 'in') return value / 12;
    if (unit === 'cm') return value / 30.48;
    return 0;
}

function convertLabelValueToFeet(value, unit) {
    switch(unit) {
        case "ft": return value;
        case "in": return value / 12;
        case "cm": return value / 30.48;
        case "m":  return value * 3.28084;
    }
    return value;
}

function realToPixels(feet) {
    return feet * scaleFactor;
}

// Mobile Sizing
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

// Fetch CSV Data
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

// Get Unique Random Images
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

// Initialize
window.addEventListener('resize', adjustForMobile);
adjustForMobile();
fetchCSV();
