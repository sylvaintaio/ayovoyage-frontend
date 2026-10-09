// Génère les icônes et l'image de partage à partir du logo et de brand.ts :
//   public/favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180),
//   icon-192.png, icon-512.png, icon-maskable-512.png, og-image.png (1200×630).
// À relancer après un changement de nom : `npm run brand:assets` (utilise Google Chrome installé).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';

import { brand, colors, escapeHtml, logoSvg } from './brand-config.mjs';

const publicDir = new URL('../public/', import.meta.url);
const font = fileURLToPath(
  new URL('../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', import.meta.url),
);

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();

/** Rend un SVG en PNG carré de `size` pixels. */
async function png(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

const write = (name, data) => {
  writeFileSync(new URL(name, publicDir), data);
  console.log(`brand-assets : public/${name}`);
};

// Favicons
write('favicon.svg', logoSvg());
const ico = await Promise.all([16, 32, 48].map((s) => png(logoSvg({ scale: s <= 16 ? 0.7 : 0.62 }), s)));
write('favicon.ico', toIco(ico, [16, 32, 48]));

// Écran d'accueil (iOS arrondit lui-même : carré plein ; Android : zone de sécurité « maskable »)
write('apple-touch-icon.png', await png(logoSvg({ rounded: false }), 180));
write('icon-192.png', await png(logoSvg(), 192));
write('icon-512.png', await png(logoSvg(), 512));
write('icon-maskable-512.png', await png(logoSvg({ rounded: false, scale: 0.46 }), 512));

// Image de partage (aperçus WhatsApp, Facebook, LinkedIn…)
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<html><head><style>
  @font-face { font-family: Archivo; src: url('data:font/woff2;base64,${readFileSync(font).toString('base64')}') format('woff2');
    font-weight: 100 900; font-stretch: 62% 125%; }
  body { margin: 0; width: 1200px; height: 630px; box-sizing: border-box; display: flex; flex-direction: column;
    justify-content: center; padding: 0 96px; background: ${colors.night}; color: #fff; font-family: Archivo, sans-serif;
    border-bottom: 18px solid ${colors.accent}; }
  .brand { display: flex; align-items: center; gap: 28px; }
  .brand svg { width: 120px; height: 120px; }
  .name { font-size: 84px; font-weight: 800; font-stretch: 108%; letter-spacing: -0.01em; }
  .tag { margin-top: 44px; font-size: 52px; font-weight: 700; line-height: 1.1; max-width: 900px; }
  .eyebrow { display: flex; align-items: center; gap: 14px; margin-top: 36px; color: ${colors.accent};
    font-size: 26px; font-weight: 700; font-stretch: 78%; letter-spacing: 0.08em; text-transform: uppercase; }
  .eyebrow::before { content: ''; width: 18px; height: 18px; background: ${colors.accent}; }
</style></head><body>
  <div class="brand">${logoSvg()}<span class="name">${escapeHtml(brand.name)}</span></div>
  <div class="tag">${escapeHtml(brand.tagline)}</div>
  <div class="eyebrow">Siège au choix · Mobile Money · Billet électronique</div>
</body></html>`);
await page.evaluate(() => document.fonts.ready);
write('og-image.png', await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));

await browser.close();

/** Fichier .ico contenant des images PNG (format accepté par tous les navigateurs actuels). */
function toIco(images, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  images.forEach((img, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i] % 256, 0);
    e.writeUInt8(sizes[i] % 256, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.length;
    entries.push(e);
  });
  return Buffer.concat([header, ...entries, ...images]);
}
