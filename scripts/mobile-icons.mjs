// Icônes des applications mobiles (1024 px), à partir du logo du site :
//   Voyageur : carré vert, bande jaune, bus blanc (identique au favicon) ;
//   Agent    : carré vert nuit, bande et bus jaunes (repérable parmi les applications du personnel).
// Sortie : mobile/apps/<app>/assets/icon/ (icon.png plein cadre, foreground.png pour Android adaptatif).
// Puis, dans chaque application : dart run flutter_launcher_icons
import { mkdirSync, writeFileSync } from 'node:fs';

import { chromium } from 'playwright-core';

import { BUS, colors } from './brand-config.mjs';

const variants = {
  voyageur: { bg: colors.primary, band: colors.accent, bus: '#ffffff' },
  agent: { bg: colors.night, band: colors.accent, bus: colors.accent },
};

/** full : carré plein avec bande ; sinon premier plan seul (Android adaptatif, zone de sécurité 66 %). */
function svg({ bg, band, bus }, full) {
  const size = 64;
  const bandH = 7;
  const scale = full ? 0.58 : 0.42;
  const b = size * scale;
  const x = (size - b) / 2;
  const y = full ? (size - bandH - b) / 2 : (size - b) / 2;
  const back = full
    ? `<rect width="${size}" height="${size}" fill="${bg}"/><rect y="${size - bandH}" width="${size}" height="${bandH}" fill="${band}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${back}
  <g transform="translate(${x} ${y}) scale(${b / 24})" fill="none" stroke="${bus}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${BUS}</g></svg>`;
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await page.setViewportSize({ width: 1024, height: 1024 });
for (const [app, v] of Object.entries(variants)) {
  const dir = new URL(`../../mobile/apps/${app}/assets/icon/`, import.meta.url);
  mkdirSync(dir, { recursive: true });
  for (const [name, full] of [['icon.png', true], ['foreground.png', false]]) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg(v, full).replace('<svg ', '<svg width="1024" height="1024" ')}</body></html>`);
    writeFileSync(new URL(name, dir), await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } }));
    console.log(`mobile-icons : apps/${app}/assets/icon/${name}`);
  }
}
await browser.close();
