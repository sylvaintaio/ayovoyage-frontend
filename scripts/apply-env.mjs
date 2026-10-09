// Recopie l'adresse de l'API (src/environments/*.ts) dans la configuration de l'hébergeur :
//   - environment.ts             → vercel.json (redirection de /api en production) ;
//   - environment.development.ts → proxy.conf.json (proxy de `ng serve`).
// Lancé automatiquement avant `npm start` et `npm run build`.
import { readFileSync, writeFileSync } from 'node:fs';

function field(file, key) {
  const source = readFileSync(new URL(`../src/environments/${file}`, import.meta.url), 'utf8');
  const m = source.match(new RegExp(`\\b${key}:\\s*'([^']*)'`));
  if (!m) {
    throw new Error(`${file} : champ « ${key} » introuvable`);
  }
  return m[1].replace(/\/$/, '');
}

function writeJson(file, update) {
  const url = new URL(`../${file}`, import.meta.url);
  const before = readFileSync(url, 'utf8');
  const data = JSON.parse(before);
  update(data);
  const after = JSON.stringify(data, null, 2) + '\n';
  if (after !== before) {
    writeFileSync(url, after);
    console.log(`${file} mis à jour`);
  }
}

const prod = { apiUrl: field('environment.ts', 'apiUrl'), apiOrigin: field('environment.ts', 'apiOrigin') };
const dev = { apiUrl: field('environment.development.ts', 'apiUrl'), apiOrigin: field('environment.development.ts', 'apiOrigin') };

for (const env of [prod, dev]) {
  if (!env.apiUrl.startsWith('/')) {
    throw new Error(`apiUrl doit être un préfixe relatif (ex. /api), reçu « ${env.apiUrl} »`);
  }
  if (!/^https?:\/\//.test(env.apiOrigin)) {
    throw new Error(`apiOrigin doit être une adresse http(s), reçu « ${env.apiOrigin} »`);
  }
}

writeJson('vercel.json', (cfg) => {
  const others = (cfg.rewrites ?? []).filter((r) => !r.source.endsWith('/:path*') || !/^https?:/.test(r.destination));
  cfg.rewrites = [{ source: `${prod.apiUrl}/:path*`, destination: `${prod.apiOrigin}/:path*` }, ...others];
});

writeJson('proxy.conf.json', (cfg) => {
  for (const key of Object.keys(cfg)) {
    delete cfg[key];
  }
  cfg[dev.apiUrl] = {
    target: dev.apiOrigin,
    secure: false,
    changeOrigin: true,
    pathRewrite: { [`^${dev.apiUrl}`]: '' },
  };
});
