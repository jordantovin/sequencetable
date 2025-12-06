(function() {
    let photoCards = [];
    let csvData = [];
    let currentPhotoIndex = 0;

    async function loadCSVData() {
        try {
            const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv');
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

    function createPhotoCard(imageUrl, photographer, isUploaded) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = photographer;
        const info = document.createElement('div');
        info.className = 'photo-info';
        const p = document.createElement('p');
        p.className = 'photographer';
        p.textContent = photographer;
        info.appendChild(p);
        if (isUploaded) {
            const badge = document.createElement('span');
            badge.className = 'uploaded-badge';
            badge.textContent = 'Uploaded';
            info.appendChild(badge);
        }
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = function() {
            card.remove();
        };
        card.appendChild(img);
        card.appendChild(info);
        card.appendChild(removeBtn);
        return card;
    }

    function handleFileUpload(event) {
        const files = event.target.files;
        const container = document.getElementById('photo-container');
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const card = createPhotoCard(e.target.result, 'Custom Upload', true);
                    container.appendChild(card);
                };
                reader.readAsDataURL(file);
            }
        }
    }

    function addPhotosFromCSV(count) {
        if (csvData.length === 0) {
            alert('Loading photos... please try again in a moment.');
            return;
        }
        const container = document.getElementById('photo-container');
        let added = 0;
        while (added < count && currentPhotoIndex < csvData.length) {
            const photo = csvData[currentPhotoIndex];
            const card = createPhotoCard(photo.link, photo.photographer, false);
            container.appendChild(card);
            currentPhotoIndex++;
            added++;
        }
        if (currentPhotoIndex >= csvData.length) {
            currentPhotoIndex = 0;
        }
    }

    window.onload = function() {
        loadCSVData();

        const uploadBtn = document.getElementById('uploadPhotoBtn');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        fileInput.onchange = handleFileUpload;
        document.body.appendChild(fileInput);
        
        uploadBtn.onclick = function() {
            fileInput.click();
        };

        document.getElementById('add5PhotosBtn').onclick = function() {
            addPhotosFromCSV(5);
        };

        document.getElementById('add1PhotoBtn').onclick = function() {
            addPhotosFromCSV(1);
        };
    };
})();
