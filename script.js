/**
 * SEQUENCE TABLE - Photo Sequencing Tool
 * Clean rebuild from scratch
 */

// Configuration
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv';

// State
let images = [];
let csvData = [];
let usedIndices = new Set();
let selectedImages = new Set();
let isGridLocked = false;
let showDimensions = false;
let showNames = false;
let zIndex = 1000;

// Wall state
let wallActive = false;
let wallScaleFactor = 1;

// Frame state
let frameSettings = { matte: 0, width: 0, unit: 'in', color: '#000000' };

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('Initializing Sequence Table...');
  await loadCSV();
  setupEventListeners();
  console.log('Sequence Table ready - buttons should work now');
}

// Load CSV data
async function loadCSV() {
  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const parsed = Papa.parse(text, { header: true });
    csvData = parsed.data.filter(row => row.Link && row.Photographer);
    console.log(`Loaded ${csvData.length} images`);
  } catch (error) {
    console.error('CSV load failed:', error);
  }
}

// Event listeners
function setupEventListeners() {
  // Upload
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadInput = document.getElementById('uploadInput');
  if (uploadBtn && uploadInput) {
    uploadBtn.onclick = () => uploadInput.click();
    uploadInput.onchange = handleUpload;
  }
  
  // Add random
  const add1Btn = document.getElementById('add1Btn');
  const add5Btn = document.getElementById('add5Btn');
  if (add1Btn) add1Btn.onclick = () => addRandomImages(1);
  if (add5Btn) add5Btn.onclick = () => addRandomImages(5);
  
  // Grid
  const snapGridBtn = document.getElementById('snapGridBtn');
  const lockBtn = document.getElementById('lockBtn');
  if (snapGridBtn) snapGridBtn.onclick = snapToGrid;
  if (lockBtn) lockBtn.onclick = toggleLock;
  
  // Display
  const dimensionsBtn = document.getElementById('dimensionsBtn');
  const namesBtn = document.getElementById('namesBtn');
  if (dimensionsBtn) dimensionsBtn.onclick = toggleDimensions;
  if (namesBtn) namesBtn.onclick = toggleNames;
  
  // Wall
  const wallBtn = document.getElementById('wallBtn');
  const resetWallBtn = document.getElementById('resetWallBtn');
  if (wallBtn) wallBtn.onclick = buildWall;
  if (resetWallBtn) resetWallBtn.onclick = resetWall;
  
  // Delete
  const deleteAllBtn = document.getElementById('deleteAllBtn');
  if (deleteAllBtn) deleteAllBtn.onclick = deleteAll;
  
  // Info
  const infoLink = document.getElementById('infoLink');
  const closeInfo = document.getElementById('closeInfo');
  const infoPopup = document.getElementById('infoPopup');
  
  if (infoLink && infoPopup) {
    infoLink.onclick = (e) => {
      e.preventDefault();
      infoPopup.classList.add('active');
    };
  }
  
  if (closeInfo && infoPopup) {
    closeInfo.onclick = () => {
      infoPopup.classList.remove('active');
    };
  }
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
  
  console.log('Event listeners attached');
}

// Add random images
function addRandomImages(count) {
  const available = csvData.map((_, i) => i).filter(i => !usedIndices.has(i));
  if (!available.length) return alert('No more images');
  
  for (let i = 0; i < Math.min(count, available.length); i++) {
    const idx = available.splice(Math.floor(Math.random() * available.length), 1)[0];
    usedIndices.add(idx);
    createImageCard(csvData[idx].Link, csvData[idx].Photographer);
  }
}

// Create image card
function createImageCard(url, name) {
  const card = document.createElement('div');
  card.className = 'image-card';
  card.style.position = 'absolute';
  card.style.left = `${200 + Math.random() * 500}px`;
  card.style.top = `${150 + Math.random() * 300}px`;
  card.style.width = '220px';
  card.style.zIndex = ++zIndex;
  
  const img = document.createElement('img');
  img.src = url;
  img.onload = () => {
    card.style.height = `${220 / (img.naturalWidth / img.naturalHeight)}px`;
    card.dataset.aspectRatio = img.naturalWidth / img.naturalHeight;
  };
  
  card.appendChild(img);
  card.dataset.name = name;
  
  // Dragging
  card.onmousedown = (e) => startDrag(e, card);
  
  document.getElementById('imageContainer').appendChild(card);
  images.push(card);
}

// Handle upload
function handleUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => createImageCard(ev.target.result, file.name);
    reader.readAsDataURL(file);
  });
}

// Dragging
let dragCard = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function startDrag(e, card) {
  if (e.button !== 0) return;
  e.preventDefault();
  
  dragCard = card;
  const rect = card.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  
  card.style.zIndex = ++zIndex;
  card.classList.add('dragging');
  
  document.onmousemove = doDrag;
  document.onmouseup = stopDrag;
}

function doDrag(e) {
  if (!dragCard) return;
  dragCard.style.left = `${e.clientX - dragOffsetX}px`;
  dragCard.style.top = `${e.clientY - dragOffsetY}px`;
}

function stopDrag() {
  if (dragCard) {
    dragCard.classList.remove('dragging');
    dragCard = null;
  }
  document.onmousemove = null;
  document.onmouseup = null;
}

// Grid snap
function snapToGrid() {
  const sorted = images.slice().sort((a, b) => {
    const aTop = parseFloat(a.style.top);
    const bTop = parseFloat(b.style.top);
    if (Math.abs(aTop - bTop) < 50) {
      return parseFloat(a.style.left) - parseFloat(b.style.left);
    }
    return aTop - bTop;
  });
  
  let x = 150, y = 100, rowHeight = 0;
  
  sorted.forEach(card => {
    const width = parseFloat(card.style.width);
    const height = parseFloat(card.style.height);
    
    if (x + width > window.innerWidth - 100) {
      x = 150;
      y += rowHeight + 60;
      rowHeight = 0;
    }
    
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    
    x += width + 60;
    rowHeight = Math.max(rowHeight, height);
  });
}

// Toggle lock
function toggleLock() {
  isGridLocked = !isGridLocked;
  const icon = document.querySelector('#lockBtn .material-symbols-outlined');
  icon.textContent = isGridLocked ? 'lock' : 'lock_open';
}

// Toggle dimensions
function toggleDimensions() {
  showDimensions = !showDimensions;
  // Update display
}

// Toggle names
function toggleNames() {
  showNames = !showNames;
  // Update display
}

// Build wall
function buildWall() {
  const width = parseFloat(document.getElementById('wallWidth').value);
  const height = parseFloat(document.getElementById('wallHeight').value);
  
  if (!width || !height) return alert('Enter wall dimensions');
  
  const wall = document.getElementById('wall');
  wall.style.width = `${width * 100}px`;
  wall.style.height = `${height * 100}px`;
  wall.classList.add('active');
  wallActive = true;
  
  document.getElementById('resetWallBtn').style.display = 'block';
}

// Reset wall
function resetWall() {
  document.getElementById('wall').classList.remove('active');
  document.getElementById('resetWallBtn').style.display = 'none';
  wallActive = false;
}

// Delete all
function deleteAll() {
  if (!confirm('Delete all images?')) return;
  document.getElementById('imageContainer').innerHTML = '';
  images = [];
  usedIndices.clear();
}

// Keyboard shortcuts
function handleKeyboard(e) {
  const key = e.key.toLowerCase();
  const cmd = e.metaKey || e.ctrlKey;
  
  if (key === 's' || key === ' ') {
    e.preventDefault();
    snapToGrid();
  } else if (key === 'l') {
    e.preventDefault();
    toggleLock();
  } else if (key === 'd') {
    e.preventDefault();
    toggleDimensions();
  } else if (key === 'n') {
    e.preventDefault();
    toggleNames();
  } else if (cmd && key === 'z') {
    e.preventDefault();
    // Undo
  } else if (cmd && e.shiftKey && key === 'z') {
    e.preventDefault();
    // Redo
  }
}

console.log('Sequence Table loaded');
