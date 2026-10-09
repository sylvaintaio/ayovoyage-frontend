// Recopie la marque (src/app/content/brand.ts) dans src/index.html et public/site.webmanifest :
// titre avant chargement, nom d'application, aperçus de liens (Open Graph), <noscript>.
// Lancé automatiquement avant `npm start` et `npm run build`.
import { readFileSync, writeFileSync } from 'node:fs';

import { brand, colors, escapeHtml } from './brand-config.mjs';

const indexFile = new URL('../src/index.html', import.meta.url);
const manifestFile = new URL('../public/site.webmanifest', import.meta.url);

const name = escapeHtml(brand.name);
const title = `${name} — ${escapeHtml(brand.tagline)}`;

let html = readFileSync(indexFile, 'utf8');
const before = html;
const description = (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? '';

// Bloc géré par ce script : tout ce qui se trouve entre les deux marqueurs est régénéré.
const block = [
  '<!-- marque:début (généré par scripts/apply-brand.mjs) -->',
  `<meta name="application-name" content="${name}" />`,
  `<meta name="apple-mobile-web-app-title" content="${name}" />`,
  `<meta name="theme-color" content="${colors.primary}" />`,
  '<link rel="icon" href="favicon.ico" sizes="48x48" />',
  '<link rel="icon" href="favicon.svg" type="image/svg+xml" />',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png" />',
  '<link rel="manifest" href="site.webmanifest" />',
  '<meta property="og:type" content="website" />',
  `<meta property="og:site_name" content="${name}" />`,
  `<meta property="og:title" content="${title}" />`,
  `<meta property="og:description" content="${description}" />`,
  `<meta property="og:url" content="${brand.siteUrl}/" />`,
  `<meta property="og:image" content="${brand.siteUrl}/og-image.png" />`,
  '<meta property="og:image:width" content="1200" />',
  '<meta property="og:image:height" content="630" />',
  '<meta property="og:locale" content="fr_FR" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<!-- marque:fin -->',
].join('\n    ');

html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript>Activez JavaScript pour utiliser ${name}.</noscript>`);
// Anciennes balises isolées (remplacées par le bloc).
html = html.replace(/\s*<meta name="(application-name|theme-color)"[^>]*>/g, '');
html = html.replace(/\s*<link rel="icon"[^>]*>/g, '');
if (html.includes('<!-- marque:début')) {
  html = html.replace(/<!-- marque:début[\s\S]*?<!-- marque:fin -->/, block);
} else {
  html = html.replace(/(\s*)<\/head>/, `\n    ${block}$1</head>`);
}
if (html !== before) {
  writeFileSync(indexFile, html);
  console.log(`apply-brand : index.html mis à jour (« ${brand.name} »)`);
}

const manifest =
  JSON.stringify(
    {
      name: brand.name,
      short_name: brand.name.length > 12 ? brand.name.slice(0, 12) : brand.name,
      description: brand.tagline,
      lang: 'fr',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: colors.primary,
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n';
let current = '';
try {
  current = readFileSync(manifestFile, 'utf8');
} catch {
  // premier passage
}
if (current !== manifest) {
  writeFileSync(manifestFile, manifest);
  console.log('apply-brand : site.webmanifest mis à jour');
}
