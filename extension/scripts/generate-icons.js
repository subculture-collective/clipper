#!/usr/bin/env node
/**
 * Generates PNG icons for the browser extension.
 * Creates solid purple icons at multiple sizes (16, 32, 48, 128px).
 * Pure Node.js – no canvas or image dependencies required.
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');

mkdirSync(iconsDir, { recursive: true });

// Clipper brand color: #9146FF (Twitch purple)
const BRAND_R = 0x91;
const BRAND_G = 0x46;
const BRAND_B = 0xff;

// Rounded rectangle 'C' icon overlay (lighter shade)
const HIGHLIGHT_R = 0xc4;
const HIGHLIGHT_G = 0xb5;
const HIGHLIGHT_B = 0xfd;

/**
 * Computes a CRC-32 checksum over the given buffer.
 */
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Wraps data in a PNG chunk with the given type tag.
 */
function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Generates a minimal valid RGB PNG of the given size.
 * Renders a solid background with a simple "C" letterform.
 */
function createIconPNG(size) {
  // Build raw pixel data (filter byte + RGB per row)
  const rowLen = size * 3;
  const raw = Buffer.alloc((rowLen + 1) * size);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.25;
  const cutAngle = Math.PI / 4; // 45° cut on the right side

  for (let y = 0; y < size; y++) {
    raw[(rowLen + 1) * y] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx); // -π to π

      // Determine if pixel is inside the "C" arc
      const inRing = dist >= innerR && dist <= outerR;
      // Exclude the right-side opening of the C
      const inOpening = Math.abs(angle) < cutAngle;
      const isC = inRing && !inOpening;

      const offset = (rowLen + 1) * y + 1 + x * 3;
      if (isC) {
        raw[offset] = HIGHLIGHT_R;
        raw[offset + 1] = HIGHLIGHT_G;
        raw[offset + 2] = HIGHLIGHT_B;
      } else {
        raw[offset] = BRAND_R;
        raw[offset + 1] = BRAND_G;
        raw[offset + 2] = BRAND_B;
      }
    }
  }

  const compressed = deflateSync(raw);

  // IHDR: width, height, bit depth=8, color type=2 (RGB)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const buf = createIconPNG(size);
  const outPath = join(iconsDir, `icon-${size}.png`);
  writeFileSync(outPath, buf);
  console.log(`✅ Generated icon-${size}.png (${buf.length} bytes)`);
}
