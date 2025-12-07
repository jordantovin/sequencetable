// ==========================
// FRAME APPLICATION LOGIC (Final Version)
// ==========================

(function() {
    
    const applyFrameBtn = document.getElementById('applyFrameBtn');
    
    if (!applyFrameBtn) return;

    // ------------------------------
    // Utility: Read Input Values
    // ------------------------------
    function getFrameSettings() {
        return {
            frameColor: document.getElementById('frameColor')?.value || '#424242',
            frameThickness: parseInt(document.getElementById('frameThickness')?.value) || 20,
            matteThickness: parseInt(document.getElementById('matteThickness')?.value) || 50,
            unit: document.getElementById('measurementUnit')?.value || 'px',
        };
    }
    
    // ------------------------------
    // Utility: Apply Frame CSS
    // ------------------------------
    function applyFrameToCard(card, settings) {
        const photoFrame = card.querySelector('.photo-frame');
        
        if (!photoFrame) return;

        const frameUnit = settings.unit;
        
        // 💡 CRITICAL FIX: Calculate the frame's position by adding the matte thickness to its offset.
        const frameOffset = settings.matteThickness;
        
        // Calculate the total thickness for margin to push the caption down
        const totalThickness = settings.matteThickness + settings.frameThickness;
        const totalBorder = `${totalThickness}${frameUnit}`;

        // 1. Matte Shadow (Inner Border - directly on the image)
        // Uses 'inset' to appear inside the bounds.
        const matteSpread = `${settings.matteThickness}${frameUnit}`;
        // Note: The spread here is 0 (blur) and 0 (distance) and matte thickness is the spread size
        const matteShadow = `inset 0 0 0 ${matteSpread} ${'#FFFFFF'}`;
        
        // 2. Frame Shadow (Outer Border - outside the matte)
        // The spread is the frame's thickness, but it must be offset (distance) by the matte thickness
        // to start where the matte ends.
        const frameDistance = `${frameOffset}${frameUnit}`;
        const frameSpread = `${settings.frameThickness}${frameUnit}`;
        
        // Shadow Format: h-shadow v-shadow blur spread color
        // We need the frame to start *at* the distance of the matte (frameOffset) and spread out by its thickness.
        // The 'spread' property handles distance from the object's edge when the main shadow values are zero.
        const frameShadow = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        
        // We will combine the outer frame shadow and use the 'border-radius' trick to ensure the frame sits 
        // outside the matte without overlap, but for simplicity and compatibility with most modern browsers, 
        // we'll stick to the combined shadow model and rely on the order:
        
        // Apply shadows: The outer (non-inset) shadow will be pushed out by the matte's margin if used, 
        // but here we rely on CSS stacking order. The correct approach using only box-shadows requires a 
        // third shadow layer to simulate the offset. However, since the matte is inset, the outer frame 
        // shadow needs an additional offset. Let's simplify and use the two layers you defined, but correctly.

        
        // We'll apply the total thickness as a margin on the photoFrame element, 
        // and let the shadows define the rings inside that margin.
        
        // Resetting box-shadow to correctly define the two layers:
        // Layer 1 (Outer Frame, non-inset)
        // Layer 2 (Inner Matte, inset)
        
        // Let's create an explicit "gap" shadow equal to the matte thickness, and then stack the frame on top.
        
        const outerShadows = [];
        
        // 1. Shadow for the FRAME (outermost ring)
        const frameRing = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        outerShadows.push(frameRing);

        // 2. Shadow for the MATTE (inner ring, simulating the push-out)
        // This non-inset shadow sits between the outer frame and the image. This color is usually white/off-white.
        const matteRing = `0 0 0 ${matteSpread} ${'#FFFFFF'}`; 
        outerShadows.push(matteRing);
        
        // The inset shadow is only needed if you want the matte to actually cover part of the image, 
        // which it should.
        
        // Let's revert to the structure that uses INSET for the matte and stack the frame OUTSIDE it.
        
        // The core issue is that `box-shadow` shadows stack *on top of* each other, not next to them. 
        // To get the Frame (20px) to sit outside the Matte (50px), we must apply a PADDING to the frame element.

        // --- NEW STRATEGY: Use Padding for the Matte and Box-Shadow for the Frame ---

        // 1. Matte (Inner border next to image): Use padding on the photoFrame.
        photoFrame.style.padding = `${settings.matteThickness}${frameUnit}`;
        
        // 2. Frame (Outer border): Use the box-shadow property.
        // We only need the frame shadow now, as the matte is handled by padding.
        
        const frameShadowFinal = `0 0 0 ${frameSpread} ${settings.frameColor}`;
        
        // Apply shadows (only the frame)
        photoFrame.style.boxShadow = frameShadowFinal;
        
        // Set the background color of the photoFrame to the matte color
        photoFrame.style.backgroundColor = '#FFFFFF'; // Assuming white matte
        
        // 3. Caption Push Down: Use total thickness (padding + shadow) for margin.
        photoFrame.style.marginBottom = totalBorder;

        // Ensure caption margin is reset
        const caption = card.querySelector('.photo-caption');
        if (caption) {
            caption.style.marginTop = '8px'; 
        }

        // Store data attributes on the card for persistence/resizing
        card.dataset.frameSettings = JSON.stringify(settings);
        
        // Optional: Add a class for visual targeting
        photoFrame.classList.add('has-frame');
    }

    // ------------------------------
    // Main Button Click Handler
    // ------------------------------
    function handleApplyFrameClick() {
        // Access the function exposed by photocards.js
        const cardsToFrame = window.getSelectedCards ? window.getSelectedCards() : [];
        
        if (cardsToFrame.length === 0) {
            console.warn('No photo cards are currently selected.');
            return;
        }
        
        const settings = getFrameSettings();
        
        cardsToFrame.forEach(card => {
            applyFrameToCard(card, settings);
        });

        console.log(`Applied frame to ${cardsToFrame.length} selected card(s).`);
    }

    // ------------------------------
    // Initialization
    // ------------------------------
    window.addEventListener('load', () => {
        applyFrameBtn.addEventListener('click', handleApplyFrameClick);
    });

})();
