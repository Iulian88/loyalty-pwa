import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../public/icons/logo-mark.svg');

// logo-mark.svg is actually a JPEG (misnamed) — sharp handles both
const input = readFileSync(src);

async function generate() {
  const DARK_BG = { r: 11, g: 11, b: 12, alpha: 1 };

  // Helper: resize + composite on dark background
  async function makeIcon(size, padding) {
    const inner = Math.round(size - padding * 2);
    const resized = await sharp(input)
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return sharp({
      create: { width: size, height: size, channels: 4, background: { ...DARK_BG } },
    })
      .composite([{ input: resized, gravity: 'center' }])
      .png()
      .toBuffer();
  }

  // 192×192
  const i192 = await makeIcon(192, 20);
  writeFileSync(resolve(__dirname, '../public/icons/icon-192.png'), i192);
  console.log('✓ icon-192.png');

  // 512×512
  const i512 = await makeIcon(512, 48);
  writeFileSync(resolve(__dirname, '../public/icons/icon-512.png'), i512);
  console.log('✓ icon-512.png');

  // apple-touch-icon 180×180
  const apple = await makeIcon(180, 18);
  writeFileSync(resolve(__dirname, '../public/icons/apple-touch-icon.png'), apple);
  console.log('✓ apple-touch-icon.png');

  // favicon 32×32 (PNG, linked as rel="icon")
  const fav32 = await makeIcon(32, 3);
  writeFileSync(resolve(__dirname, '../public/favicon-32.png'), fav32);
  console.log('✓ favicon-32.png');

  // og-image 1200×630 — centered logo ~280px on dark bg
  const logoSize = 280;
  const ogLogo = await sharp(input)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ogImg = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: { r: 11, g: 11, b: 12, alpha: 1 } },
  })
    .composite([{ input: ogLogo, gravity: 'center' }])
    .png()
    .toBuffer();
  writeFileSync(resolve(__dirname, '../public/og-image.png'), ogImg);
  console.log('✓ og-image.png');

  console.log('\nAll assets generated.');
}

generate().catch(e => { console.error(e); process.exit(1); });
