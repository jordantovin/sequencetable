// ============================================
// CONFIG.JS - Constants & Configuration
// ============================================

// CSV Data Source
const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5j1OVFnwB19xVA3ZVM46C8tNKvGHimyElwIAgMFDzurSEFA0m_8iHBIvD1_TKbtlfWw2MaDAirm47/pub?output=csv';

// Image Sizing
const MIN_SIZE = 50;
let imageWidth = 220;
let imageHeight = 165;

// Layout Constants
const leftOffset = 280;
const rightOffset = 10;

// Conversion Constants
const PX_PER_INCH = 96;
const CM_PER_INCH = 2.54;

// Lock SVG Icons
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
