diff --git a/photocards.js b/photocards.js
index cd8983bed37c5fc58e3adcfe36ed93e6dad3ed2f..05114e7de35768fb13bfb1e25baec59af84c743b 100644
--- a/photocards.js
+++ b/photocards.js
@@ -17,98 +17,107 @@
             const csvText = await response.text();
             const rows = csvText.split('\n');
             csvData = rows.slice(1).filter(row => row.trim()).map(row => {
                 const [link, photographer] = row.split(',');
                 return { link: link ? link.trim() : '', photographer: photographer ? photographer.trim() : 'Unknown' };
             });
         } catch (error) {
             console.error('Error loading CSV:', error);
         }
     }
 
     function makeCardInteractive(card) {
         // Store transform state
         card.dataset.rotation = '0';
         
         // Random initial position
         const randomX = Math.random() * (window.innerWidth - 400) + 50;
         const randomY = Math.random() * (window.innerHeight - 400) + 150;
         card.dataset.x = randomX;
         card.dataset.y = randomY;
         
         updateCardTransform(card);
 
         // Drag functionality
         card.addEventListener('mousedown', function(e) {
+            if (window.isGridLocked && window.isGridLocked()) {
+                return;
+            }
             if (e.target.classList.contains('resize-handle') ||
                 e.target.classList.contains('rotate-handle')) {
                 return;
             }
             
             isDragging = true;
             activeCard = card;
             
             // Get current position from transform
             const currentX = parseFloat(card.dataset.x) || 0;
             const currentY = parseFloat(card.dataset.y) || 0;
             
             // Calculate offset from current position
             dragOffset.x = e.clientX - currentX;
             dragOffset.y = e.clientY - currentY;
             
             card.style.zIndex = getHighestZIndex() + 1;
             e.preventDefault();
         });
 
         // Add resize handle
         const resizeHandle = document.createElement('div');
         resizeHandle.className = 'resize-handle';
         resizeHandle.innerHTML = '⇲';
         card.appendChild(resizeHandle);
 
         resizeHandle.addEventListener('mousedown', function(e) {
+            if (window.isGridLocked && window.isGridLocked()) {
+                return;
+            }
             isResizing = true;
             activeCard = card;
             resizeStartX = e.clientX;
             resizeStartY = e.clientY;
             
             const img = card.querySelector('img');
             resizeStartWidth = img.offsetWidth;
             resizeStartHeight = img.offsetHeight;
             
             e.stopPropagation();
             e.preventDefault();
         });
 
         // Add rotate handle
         const rotateHandle = document.createElement('div');
         rotateHandle.className = 'rotate-handle';
         rotateHandle.innerHTML = '↻';
         card.appendChild(rotateHandle);
 
         let rotateStartAngle = 0;
         rotateHandle.addEventListener('mousedown', function(e) {
+            if (window.isGridLocked && window.isGridLocked()) {
+                return;
+            }
             activeCard = card;
             const rect = card.getBoundingClientRect();
             const centerX = rect.left + rect.width / 2;
             const centerY = rect.top + rect.height / 2;
             
             const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
             rotateStartAngle = startAngle - parseFloat(card.dataset.rotation);
             
             function rotateMove(e) {
                 const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
                 card.dataset.rotation = currentAngle - rotateStartAngle;
                 updateCardTransform(card);
             }
             
             function rotateEnd() {
                 document.removeEventListener('mousemove', rotateMove);
                 document.removeEventListener('mouseup', rotateEnd);
             }
             
             document.addEventListener('mousemove', rotateMove);
             document.addEventListener('mouseup', rotateEnd);
             
             e.stopPropagation();
             e.preventDefault();
         });
@@ -140,55 +149,50 @@
         
         if (isDragging && activeCard) {
             const x = e.clientX - dragOffset.x;
             const y = e.clientY - dragOffset.y;
             activeCard.dataset.x = x;
             activeCard.dataset.y = y;
             updateCardTransform(activeCard);
         }
         
         if (isResizing && activeCard) {
             const img = activeCard.querySelector('img');
             const deltaX = e.clientX - resizeStartX;
             const deltaY = e.clientY - resizeStartY;
             
             const newWidth = Math.max(150, resizeStartWidth + deltaX);
             const aspectRatio = resizeStartHeight / resizeStartWidth;
             const newHeight = newWidth * aspectRatio;
             
             img.style.width = newWidth + 'px';
             img.style.height = newHeight + 'px';
         }
     });
 
     // Global mouse up handler
     document.addEventListener('mouseup', function() {  
         isDragging = false;
         isResizing = false;
         activeCard = null;
     });
 
     function createPhotoCard(imageUrl, photographer, isUploaded) {
         const card = document.createElement('div');
         card.className = 'photo-card';
         
         const img = document.createElement('img');
         img.src = imageUrl;
         img.alt = photographer;
         
         // Load image to get natural aspect ratio
         img.onload = function() {
             const aspectRatio = img.naturalHeight / img.naturalWidth;
             const width = 300;
             img.style.width = width + 'px';
             img.style.height = (width * aspectRatio) + 'px';
         };
         
         card.appendChild(img);
         
         makeCardInteractive(card);
         
