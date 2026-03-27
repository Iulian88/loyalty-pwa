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

// Build a multi-size ICO file from an array of { buf, w, h }
function buildIco(images) {
  const count = images.length;
  const headerSize = 6 + count * 16;
  let dataOffset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);   // reserved
  header.writeUInt16LE(1, 2);   // type = ICO
  header.writeUInt16LE(count, 4);

  const entries = images.map(({ buf, w, h }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(w >= 256 ? 0 : w, 0);   // width  (0 = 256)
    entry.writeUInt8(h >= 256 ? 0 : h, 1);   // height (0 = 256)
    entry.writeUInt8(0, 2);                   // color count
    entry.writeUInt8(0, 3);                   // reserved
    entry.writeUInt16LE(1, 4);                // planes
    entry.writeUInt16LE(32, 6);               // bits per pixel
    entry.writeUInt32LE(buf.length, 8);       // size of image data
    entry.writeUInt32LE(dataOffset, 12);      // offset of image data
    dataOffset += buf.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(i => i.buf)]);
}

// Generate favicons from the already-correct icon-512.png (square, centred)
async function makeFavicons() {
  const src512 = resolve(__dirname, '../public/icons/icon-512.png');

  const p32 = await sharp(src512).resize(32, 32).png().toBuffer();
  writeFileSync(resolve(__dirname, '../public/favicon-32x32.png'), p32);
  console.log('✓ favicon-32x32.png');

  const p16 = await sharp(src512).resize(16, 16).png().toBuffer();
  writeFileSync(resolve(__dirname, '../public/favicon-16x16.png'), p16);
  console.log('✓ favicon-16x16.png');

  const ico = buildIco([{ buf: p16, w: 16, h: 16 }, { buf: p32, w: 32, h: 32 }]);
  writeFileSync(resolve(__dirname, '../public/favicon.ico'), ico);
  console.log('✓ favicon.ico (16+32px embedded PNGs)');
}

async function generate() {
  const bbox = await getLogoBbox();
  await makeIcon(192, resolve(__dirname, '../public/icons/icon-192.png'), bbox);
  await makeIcon(512, resolve(__dirname, '../public/icons/icon-512.png'), bbox);
  await makeIcon(180, resolve(__dirname, '../public/icons/apple-touch-icon.png'), bbox);
  console.log('');
  await makeFavicons();
  console.log('\nAll icons generated — perfectly centred on black canvas.');
}

generate().catch(e => { console.error(e); process.exit(1); });
