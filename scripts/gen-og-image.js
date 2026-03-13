#!/usr/bin/env node
/**
 * Generate OG image PNG (1200x630) using only Node.js built-ins.
 * Renders a branded GreenLedger card — no canvas required.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 1200;
const H = 630;

// --- CRC32 ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, t, data, crc]);
}

// --- Pixel buffer (RGB) ---
const pixels = Buffer.alloc(W * H * 3);

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b;
}

function fillRect(x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b);
}

// --- Draw ---
// Background: #0a0f0a
fillRect(0, 0, W, H, 10, 15, 10);

// Subtle green radial glow (center-left area)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const cx = 350, cy = 315;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const glow = Math.max(0, 1 - dist / 500);
    const g = Math.round(15 + glow * glow * 40);
    const i = (y * W + x) * 3;
    pixels[i+1] = Math.min(255, pixels[i+1] + g);
  }
}

// Border glow lines (left side)
for (let y = 0; y < H; y++) {
  const alpha = 0.3;
  const r2 = Math.round(34 * alpha), g2 = Math.round(197 * alpha), b2 = Math.round(94 * alpha);
  setPixel(0, y, r2, g2, b2);
  setPixel(1, y, Math.round(r2 * 0.5), Math.round(g2 * 0.5), Math.round(b2 * 0.5));
}

// Top border
for (let x = 0; x < W; x++) {
  const v = 20;
  setPixel(x, 0, v, v + 10, v);
  setPixel(x, 1, Math.round(v * 0.5), Math.round((v+10)*0.5), Math.round(v * 0.5));
}

// Green accent bar (top, thick)
fillRect(0, 0, W, 4, 22, 80, 40);

// --- 8×8 bitmap font for key characters ---
// A compact 5×7 pixel font stored as bitmask rows
const FONT5 = {
  'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
  'r': [0b00000,0b00000,0b01110,0b10001,0b10000,0b10000,0b10000],
  'e': [0b00000,0b00000,0b01110,0b10001,0b11111,0b10000,0b01110],
  'n': [0b00000,0b00000,0b10110,0b11001,0b10001,0b10001,0b10001],
  'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  'd': [0b00001,0b00001,0b01101,0b10011,0b10001,0b10001,0b01101],
  'g': [0b00000,0b00000,0b01110,0b10001,0b10001,0b01111,0b00001,0b01110],
  'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'S': [0b01110,0b10001,0b10000,0b01110,0b00001,0b10001,0b01110],
  'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  '2': [0b01110,0b10001,0b00001,0b00110,0b01000,0b10000,0b11111],
  ' ': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00000,0b00000],
  '-': [0b00000,0b00000,0b00000,0b11111,0b00000,0b00000,0b00000],
  'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  'o': [0b00000,0b00000,0b01110,0b10001,0b10001,0b10001,0b01110],
  'm': [0b00000,0b00000,0b11010,0b10101,0b10101,0b10001,0b10001],
  'p': [0b00000,0b00000,0b11110,0b10001,0b11110,0b10000,0b10000],
  'l': [0b01100,0b00100,0b00100,0b00100,0b00100,0b00100,0b01110],
  'i': [0b01110,0b00100,0b00000,0b00100,0b00100,0b00100,0b01110],
  'a': [0b00000,0b00000,0b01110,0b00001,0b01111,0b10001,0b01111],
  'c': [0b00000,0b00000,0b01110,0b10001,0b10000,0b10001,0b01110],
  'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'u': [0b00000,0b00000,0b10001,0b10001,0b10001,0b10011,0b01101],
  's': [0b00000,0b00000,0b01110,0b10000,0b01110,0b00001,0b11110],
  't': [0b00100,0b00100,0b01110,0b00100,0b00100,0b00100,0b00011],
  'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  'y': [0b00000,0b00000,0b10001,0b10001,0b01111,0b00001,0b01110],
  'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  'f': [0b00110,0b01001,0b01000,0b11100,0b01000,0b01000,0b01000],
  'h': [0b10000,0b10000,0b10110,0b11001,0b10001,0b10001,0b10001],
  'o2': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'w': [0b00000,0b00000,0b10001,0b10001,0b10101,0b11011,0b10001],
  '4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  '8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
};

function drawChar(ch, startX, startY, scale, r, g, b) {
  const rows = FONT5[ch];
  if (!rows) return;
  for (let row = 0; row < rows.length; row++) {
    const bits = rows[row];
    for (let col = 4; col >= 0; col--) {
      if (bits & (1 << col)) {
        const px = startX + (4 - col) * scale;
        const py = startY + row * scale;
        fillRect(px, py, scale, scale, r, g, b);
      }
    }
  }
}

function drawText(text, startX, startY, scale, r, g, b) {
  let x = startX;
  for (const ch of text) {
    drawChar(ch, x, startY, scale, r, g, b);
    x += (5 + 1) * scale; // 5px wide + 1px spacing
  }
}

// Main brand title: "GreenLedger"
const scale1 = 8;
drawText('G', 80, 150, scale1, 34, 197, 94);
drawText('r', 80 + 6*scale1, 150, scale1, 34, 197, 94);
drawText('e', 80 + 12*scale1, 150, scale1, 34, 197, 94);
drawText('e', 80 + 18*scale1, 150, scale1, 34, 197, 94);
drawText('n', 80 + 24*scale1, 150, scale1, 34, 197, 94);
// "Ledger" in white
drawText('L', 80 + 31*scale1, 150, scale1, 240, 253, 244);
drawText('e', 80 + 37*scale1, 150, scale1, 240, 253, 244);
drawText('d', 80 + 43*scale1, 150, scale1, 240, 253, 244);
drawText('g', 80 + 49*scale1, 150, scale1, 240, 253, 244);
drawText('e', 80 + 55*scale1, 150, scale1, 240, 253, 244);
drawText('r', 80 + 61*scale1, 150, scale1, 240, 253, 244);

// Tagline: "AASB S2 Compliance in 48 Hours"
const scale2 = 5;
const tagY = 290;
const tagText = 'AASB S2 Compliance - Built for Australia';
let tx = 80;
for (const ch of tagText) {
  drawChar(ch, tx, tagY, scale2, 134, 239, 172);
  tx += (5 + 1) * scale2;
}

// Price badge box
fillRect(80, 380, 280, 70, 17, 34, 17);
// Badge border
for (let x = 80; x < 360; x++) { setPixel(x, 380, 34, 80, 50); setPixel(x, 449, 34, 80, 50); }
for (let y = 380; y < 450; y++) { setPixel(80, y, 34, 80, 50); setPixel(359, y, 34, 80, 50); }

// "$499" text in green
const scaleP = 6;
drawText('S', 100, 400, scaleP, 34, 197, 94);
drawText('4', 100 + 6*scaleP, 400, scaleP, 34, 197, 94);
drawText('9', 100 + 12*scaleP, 400, scaleP, 34, 197, 94);

// Separator line (right of badge)
const scale3 = 4;
const line2X = 420;
drawText('4', line2X, 400, scale3, 134, 239, 172);
drawText('8', line2X + 5*scale3, 400, scale3, 134, 239, 172);

// "Made in Australia" small label at bottom
const scaleS = 3;
const labelY = H - 60;
const label = 'Made in Australia - AASB S2 Native - No Consultants Required';
let lx = 80;
for (const ch of label) {
  drawChar(ch, lx, labelY, scaleS, 75, 120, 90);
  lx += (5 + 1) * scaleS;
  if (lx > W - 100) break;
}

// Green dot accent (top-left)
for (let y = 30; y < 80; y++) for (let x = 30; x < 80; x++) {
  const d = Math.sqrt((x-55)**2 + (y-55)**2);
  if (d < 20) setPixel(x, y, 22, 197, 94);
  else if (d < 22) setPixel(x, y, 10, 100, 50);
}

// --- Build PNG ---
// Pack rows: each row has a filter byte (0 = None) followed by RGB data
const rawRows = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const rowOffset = y * (1 + W * 3);
  rawRows[rowOffset] = 0; // filter None
  pixels.copy(rawRows, rowOffset + 1, y * W * 3, (y + 1) * W * 3);
}

const compressed = zlib.deflateSync(rawRows, { level: 6 });

const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(W, 0);
ihdrData.writeUInt32BE(H, 4);
ihdrData[8] = 8;  // bit depth
ihdrData[9] = 2;  // color type: RGB
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
  pngChunk('IHDR', ihdrData),
  pngChunk('IDAT', compressed),
  pngChunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'public', 'og-image.png');
fs.writeFileSync(outPath, png);
console.log(`✅ OG image generated: ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);
