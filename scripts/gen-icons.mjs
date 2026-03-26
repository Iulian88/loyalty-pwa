import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../public/icons/logo-mark.svg');

const BLACK = { r: 0, g: 0, b: 0, alpha: 1 };
const FILL_RATIO = 0.72;
const BRIGHT_THRESHOLD = 35; // min RGB brightness to count as logo content

// Step 1: render SVG → flatten to black → scan for logo bounding box
async function getLogoBbox() {
  const RENDER_W = 1200; // render resolution for scanning
  const meta = await sharp(src, { density: 72 }).metadata();
  const density = Math.round(72 * RENDER_W / (meta.width || 422));

  const pngBuf = await sharp(src, { density })
    .flatten({ background: BLACK })
    .png()
    .toBuffer();

  const { data, info } = await sharp(pngBuf).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const bright = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (bright > BRIGHT_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Rendered: ${width}x${height} | Logo bbox: (${minX},${minY})-(${maxX},${maxY}) = ${maxX - minX}x${maxY - minY}`);
  console.log(`Center: (${Math.round((minX + maxX) / 2)}, ${Math.round((minY + maxY) / 2)})`);

  return { pngBuf, width, height, minX, maxX, minY, maxY };
}

// Step 2: extract exact square centred on logo, resize, place on black canvas
async function makeIcon(size, outPath, bbox) {
  const { pngBuf, width, height, minX, maxX, minY, maxY } = bbox;

  const logoW = maxX - minX + 1;
  const logoH = maxY - minY + 1;
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);

  // Square crop sized so logo fills FILL_RATIO of the crop
  const cropPx = Math.round(Math.max(logoW, logoH) / FILL_RATIO);
  const half = Math.round(cropPx / 2);

  // Extend source image on all sides so the centred crop never goes out of bounds
  const pad = half + 4;
  const extBuf = await sharp(pngBuf)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BLACK })
    .png()
    .toBuffer();

  // cx/cy shift by pad in extended image; extract square centred on logo
  const buf = await sharp(extBuf)
    .extract({ left: (cx + pad) - half, top: (cy + pad) - half, width: cropPx, height: cropPx })
    .resize(size, size, { fit: 'fill' }) // already square, no distortion
    .flatten({ background: BLACK })
    .png()
    .toBuffer();

  writeFileSync(outPath, buf);
  console.log(`✓ ${outPath.split('/').pop()} (${size}x${size})`);
}

async function generate() {
  const bbox = await getLogoBbox();
  await makeIcon(192, resolve(__dirname, '../public/icons/icon-192.png'), bbox);
  await makeIcon(512, resolve(__dirname, '../public/icons/icon-512.png'), bbox);
  await makeIcon(180, resolve(__dirname, '../public/icons/apple-touch-icon.png'), bbox);
  console.log('\nAll icons generated — perfectly centred on black canvas.');
}

generate().catch(e => { console.error(e); process.exit(1); });
