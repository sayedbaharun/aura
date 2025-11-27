#!/usr/bin/env node

/**
 * PWA Icon & Splash Screen Generator for Hikma-OS
 *
 * This script generates all required icons and splash screens for iOS/Android PWA.
 *
 * Usage: node scripts/generate-pwa-icons.js
 *
 * Prerequisites: npm install sharp (optional, falls back to simple PNGs)
 */

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const ICON_SIZES = [16, 32, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];

// Splash screen sizes for iOS
const SPLASH_SIZES = [
  { width: 1125, height: 2436 }, // iPhone X/XS/11 Pro
  { width: 828, height: 1792 },  // iPhone XR/11
  { width: 1242, height: 2688 }, // iPhone XS Max/11 Pro Max
  { width: 1170, height: 2532 }, // iPhone 12/13/14
  { width: 1284, height: 2778 }, // iPhone 12/13/14 Pro Max
  { width: 1179, height: 2556 }, // iPhone 14 Pro
  { width: 1290, height: 2796 }, // iPhone 14 Pro Max
  { width: 2048, height: 2732 }, // iPad Pro 12.9"
  { width: 1668, height: 2388 }, // iPad Pro 11"
  { width: 1640, height: 2360 }, // iPad Air
  { width: 1488, height: 2266 }, // iPad Mini
];

// Colors
const BACKGROUND_COLOR = '#0f172a'; // Dark slate
const ICON_COLOR = '#3b82f6';       // Blue
const TEXT_COLOR = '#ffffff';

// Output directories
const ICONS_DIR = path.join(__dirname, '../client/public/icons');
const SPLASH_DIR = path.join(__dirname, '../client/public/splash');

// Ensure directories exist
fs.mkdirSync(ICONS_DIR, { recursive: true });
fs.mkdirSync(SPLASH_DIR, { recursive: true });

/**
 * Create a simple PNG with the "H" logo
 * Uses a minimal PNG encoder (no dependencies)
 */
function createSimplePNG(width, height, isIcon = true) {
  // Create PNG using raw bytes (simplified)
  // This creates a solid color PNG - replace with sharp for better icons

  const png = createMinimalPNG(width, height, BACKGROUND_COLOR, isIcon ? ICON_COLOR : null);
  return png;
}

/**
 * Minimal PNG creator (no dependencies)
 * Creates a simple solid color or gradient PNG
 */
function createMinimalPNG(width, height, bgColor, accentColor) {
  // Parse hex colors
  const bg = hexToRgb(bgColor);

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = createIHDRChunk(width, height);

  // IDAT chunk (image data)
  const idat = createIDATChunk(width, height, bg, accentColor ? hexToRgb(accentColor) : null);

  // IEND chunk
  const iend = createIENDChunk();

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function createIHDRChunk(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data.writeUInt8(8, 8);  // bit depth
  data.writeUInt8(2, 9);  // color type (RGB)
  data.writeUInt8(0, 10); // compression
  data.writeUInt8(0, 11); // filter
  data.writeUInt8(0, 12); // interlace

  return createChunk('IHDR', data);
}

function createIDATChunk(width, height, bg, accent) {
  const zlib = require('zlib');

  // Create raw image data (RGB, with filter byte per row)
  const rowSize = width * 3 + 1; // 3 bytes per pixel + 1 filter byte
  const raw = Buffer.alloc(rowSize * height);

  const centerX = width / 2;
  const centerY = height / 2;
  const iconSize = Math.min(width, height) * 0.4;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // No filter

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;

      // Draw "H" shape if accent color provided
      let color = bg;
      if (accent) {
        const relX = x - centerX;
        const relY = y - centerY;
        const letterWidth = iconSize * 0.6;
        const letterHeight = iconSize * 0.8;
        const strokeWidth = iconSize * 0.15;

        // H shape detection
        const inLeftBar = relX >= -letterWidth/2 && relX <= -letterWidth/2 + strokeWidth &&
                          relY >= -letterHeight/2 && relY <= letterHeight/2;
        const inRightBar = relX >= letterWidth/2 - strokeWidth && relX <= letterWidth/2 &&
                           relY >= -letterHeight/2 && relY <= letterHeight/2;
        const inMiddleBar = relX >= -letterWidth/2 && relX <= letterWidth/2 &&
                            relY >= -strokeWidth/2 && relY <= strokeWidth/2;

        if (inLeftBar || inRightBar || inMiddleBar) {
          color = accent;
        }
      }

      raw[pixelOffset] = color.r;
      raw[pixelOffset + 1] = color.g;
      raw[pixelOffset + 2] = color.b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  return createChunk('IDAT', compressed);
}

function createIENDChunk() {
  return createChunk('IEND', Buffer.alloc(0));
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation for PNG
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

// Pre-computed CRC32 table
const crc32Table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[i] = c;
}

// Generate icons
console.log('Generating PWA icons...');
for (const size of ICON_SIZES) {
  const filename = `icon-${size}x${size}.png`;
  const filepath = path.join(ICONS_DIR, filename);
  const png = createSimplePNG(size, size, true);
  fs.writeFileSync(filepath, png);
  console.log(`  Created ${filename}`);
}

// Generate splash screens
console.log('\nGenerating splash screens...');
for (const { width, height } of SPLASH_SIZES) {
  const filename = `splash-${width}x${height}.png`;
  const filepath = path.join(SPLASH_DIR, filename);
  const png = createSimplePNG(width, height, false);
  fs.writeFileSync(filepath, png);
  console.log(`  Created ${filename}`);
}

console.log('\nDone! Icons and splash screens generated.');
console.log('\nTip: For better quality icons, install sharp and modify this script:');
console.log('  npm install sharp');
