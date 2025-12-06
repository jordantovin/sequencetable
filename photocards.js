// Photo data array to store all photos
let photoCards = [];
let csvData = [];
let currentPhotoIndex = 0;

// Fetch and parse CSV data on page load
async function loadCSVData() {
    try {
        const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv');
        const csvText = await response.text();
        
        // Parse CSV
        const rows = csvText.split('\n');
        csvData = rows.slice(1) // Skip header row
            .filter(row => row.trim()) // Remove empty rows
            .map(row => {
                const [link, photographer] = row.split(',');
                return {
                    link: link.trim(),
                    photographer: photographer.trim()
                };
            });
        
        console.log(`Loaded ${csvData.length} photos from CSV`);
    } catch (error) {
        console.error('Error loading CSV:', error);
    }
}

// Create a photo card element
function createPhotoCard(imageUrl, photographer, isUploaded = false) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.innerHTML = `
        <img src="${imageUrl}" alt="${photographer || 'Photo'}" />
        <div class="photo-info">
            <p class="photographer">${photographer || 'Unknown'}</p>
            ${isUploaded ? '<span class="uploaded-badge">Uploaded</span>' : ''}
        </div>
        <button class="remove-btn" onclick="removePhotoCard(this)">×</button>
    `;
    return card;
}

// Handle file upload
function handleFileUpload(event) {
    const files = event.target.files;
    const container = document.getElementById('photo-container');
    
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const card = createPhotoCard(e.target.result, 'Custom Upload', true);
                container.appendChild(card);
                photoCards.push({
                    url: e.target.result,
                    photographer: 'Custom Upload',
                    isUploaded: true
                });
            };
            reader.readAsDataURL(file);
        }
    }
}

// Add photos from CSV
function addPhotosFromCSV(count) {
    if (csvData.length === 0) {
        alert('Loading photos... please try again in a moment.');
        return;
    }
    
    const container = document.getElementById('photo-container');
    let added = 0;
    
    while (added < count && currentPhotoIndex < csvData.length) {
        const photo = csvData[currentPhotoIndex];
        const card = createPhotoCard(photo.link, photo.photographer);
        container.appendChild(card);
        photoCards.push({
            url: photo.link,
            photographer: photo.photographer,
            isUploaded: false
        });
        
        currentPhotoIndex++;
        added++;
    }
    
    if (added < count) {
        // If we've run out of photos, loop back to the beginning
        currentPhotoIndex = 0;
        alert(`Added ${added} photos. Reached end of library.`);
    }
}

// Remove photo card
function removePhotoCard(button) {
    const card = button.parentElement;
    const index = Array.from(card.parentElement.children).indexOf(card);
    
    card.remove();
    photoCards.splice(index, 1);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load CSV data
    loadCSVData();
    
    // Upload photo button
    const uploadBtn = document.querySelector('[title="Upload photo"]');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileUpload);
    document.body.appendChild(fileInput);
    
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    // +5 photos button
    const add5Btn = document.querySelector('[title="+5 photos"]');
    add5Btn.addEventListener('click', () => {
        addPhotosFromCSV(5);
    });
    
    // +1 photo button
    const add1Btn = document.querySelector('[title="+1 photo"]');
    add1Btn.addEventListener('click', () => {
        addPhotosFromCSV(1);
    });
});
