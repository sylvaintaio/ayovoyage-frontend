// Lecture de src/app/content/brand.ts pour les scripts de build (sans compiler le TypeScript).
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/content/brand.ts', import.meta.url), 'utf8');

function field(key) {
  const m = source.match(new RegExp(`\\b${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
  if (!m) {
    throw new Error(`brand.ts : champ « ${key} » introuvable`);
  }
  return m[1].replace(/\\'/g, "'");
}

export const brand = {
  name: field('name'),
  tagline: field('tagline'),
  siteUrl: field('siteUrl').replace(/\/$/, ''),
};

// Couleurs de la charte (identiques à src/styles/_tokens.scss).
export const colors = { primary: '#0b4d3a', accent: '#f5b700', night: '#0a2a20', ink: '#121614' };

export const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Pictogramme « Bus » (Lucide), identique au logo du site.
const BUS = `<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>`;

/**
 * Logo « panneau » en SVG : carré vert, filet jaune en bas, bus blanc.
 * rounded : coins arrondis (favicon) ; sinon carré plein (iOS arrondit lui-même).
 * scale : taille du bus dans le carré (plus petit pour les icônes « maskable »).
 */
export function logoSvg({ rounded = true, scale = 0.62 } = {}) {
  const size = 64;
  const band = 7;
  const bus = size * scale;
  const x = (size - bus) / 2;
  const y = (size - band - bus) / 2;
  const r = rounded ? 9 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="c"><rect width="${size}" height="${size}" rx="${r}"/></clipPath></defs>
  <g clip-path="url(#c)">
    <rect width="${size}" height="${size}" fill="${colors.primary}"/>
    <rect y="${size - band}" width="${size}" height="${band}" fill="${colors.accent}"/>
  </g>
  <g transform="translate(${x} ${y}) scale(${bus / 24})" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${BUS}</g>
</svg>
`;
}
