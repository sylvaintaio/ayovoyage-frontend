/**
 * Nom de la plateforme côté site web : à modifier ICI UNIQUEMENT.
 *
 * S'applique aux titres des onglets, au logo, aux contenus, aux pages légales,
 * à la page de connexion du back-office et à `index.html` (réécrit à chaque
 * `npm start` / `npm run build` par `scripts/apply-brand.mjs`).
 *
 * Icônes (favicon, écran d'accueil) et image de partage : `npm run brand:assets`
 * après un changement de nom (scripts/brand-assets.mjs).
 *
 * Côté serveur (e-mails, factures, double authentification, documentation de
 * l'API), le nom vient de la variable d'environnement BRAND_NAME : garder les
 * deux valeurs identiques.
 */
export const BRAND = {
  name: 'Ayò Voyage',
  /** Domaine des adresses de contact (contact@…). */
  domain: 'ayovoyage.bj',
  /** Adresse publique du site (aperçus de liens WhatsApp / Facebook, manifeste). */
  siteUrl: 'https://ayovoyage.vercel.app',
  /** Accroche affichée dans l'onglet de la page d'accueil. */
  tagline: 'Réservez votre voyage en bus',
} as const;

/** Initiales du logo : « Ayò Voyage » → « BV », « Trans Express » → « TE ». */
export function brandInitials(name: string = BRAND.name): string {
  const words = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => w[0]) : [...(words[0] ?? '?')].slice(0, 2);
  return letters.join('').toUpperCase();
}

/** Nom de fichier : « Ayò Voyage » → « ayò voyage ». */
export function brandSlug(name: string = BRAND.name): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
