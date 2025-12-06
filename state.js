// ============================================
// STATE.JS - Global State Management
// ============================================

// DOM Elements
const gallery = document.getElementById('gallery');
const uploadBtn = document.getElementById('uploadBtn');
const uploadInput = document.getElementById('uploadInput');
const snapBtn = document.getElementById('snapGridBtn');

// Image Management
const loadedImages = [];
let imagesData = [];
const usedIndices = new Set();

// UI State
let namesVisible = false;
let demensVisible = false;
let wallDimensionsVisible = false;
let zIndexCounter = 10000;

// Grid & Sorting
let isSortingGrid = false;
let originalGridOrder = [];
let lockButton;

// Frame Settings
let frameColor = "black";
let liveFrameSettings = {
    matte: 0,
    frame: 0,
    unit: "in",
    color: "black"
};

// Wall Settings
let wallWidthReal = 10;
let wallHeightReal = 8;
let wallUnit = 'ft';
let scaleFactor = 10;
let suppressWallUpdate = false;

// Wall Elements
const mockWall = document.createElement('div');
mockWall.id = 'mockWall';
mockWall.style.display = 'none';
document.body.appendChild(mockWall);

let wallWidthLine = null;
let wallWidthLabel = null;
let wallHeightLine = null;
let wallHeightLabel = null;

// Hang Height
let hangLine = null;
let hangLineLabel = null;

// Undo/Redo
const undoStack = [];
const redoStack = [];

// Multi-Select
const selectedCards = new Set();
let isMarquee = false;
let startX = 0;
let startY = 0;
let marqueeEl = null;

// Drag Frame Tool
let dragFrameActive = false;
let dragGhost = null;

// Global Scale
let globalScale = 1;
let scaleDraggingH = false;

// Popovers
let wallPopoverOpen = false;
let hhOpen = false;
