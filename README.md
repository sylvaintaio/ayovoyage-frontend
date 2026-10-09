# BUS-VOYAGE — application web (Angular 22)

Une seule application avec trois espaces, chacun chargé à la demande :

| Espace | URL | Accès |
|---|---|---|
| Site public | `/`, `/lignes`, `/services`, `/colis`, `/agences`, `/fidelite`, `/a-propos`, `/faq`, `/contact`, `/recherche`, `/departs/:id`, `/connexion` | Tout le monde |
| Espace client | `/compte/…` (réservations, billets, fidélité, proches, profil), `/reservation/:id/paiement` | Client connecté par SMS |
| Back-office | `/admin/…` | Personnel, menu filtré selon le rôle |

## Personnaliser les textes de la société

Tous les textes de présentation se trouvent dans **`src/app/content/site-content.ts`** : nom, accroche, histoire, mission, valeurs, engagements, services, étapes, colis, FAQ, téléphone, WhatsApp, e-mail, réseaux sociaux, moyens de paiement. Les valeurs `[À COMPLÉTER]` sont à remplacer avant la mise en ligne. Les engagements (sécurité, assurance…) ne doivent être publiés que s'ils sont réellement appliqués.

Les chiffres (villes, agences, lignes, départs de la semaine), les lignes et tarifs, les classes de sièges et les niveaux de fidélité viennent **en direct de l'API** (`GET /v1/public/showcase`) : ils reflètent la configuration du back-office, et un chiffre nul n'est jamais affiché.

Les avis de voyageurs (`TESTIMONIALS`) et le bandeau d'information (`INFO_BANNER`) sont vides par défaut, donc masqués. Ne publiez que des avis réels, recueillis avec l'accord des personnes.

L'illustration du bus est un dessin vectoriel léger. Remplacez-la par de vraies photos de la flotte et des agences dès que possible (format WebP, compressées).

## Démarrage

```bash
# Prérequis : l'API tourne sur http://localhost:8080 (voir ../backend)
npm install
npm start            # http://localhost:4200 — le proxy envoie /api/* vers l'API
```

Comptes de démonstration : voir le README à la racine. Connexion client : le code SMS s'affiche à l'écran en développement.

## Commandes

| Commande | Rôle |
|---|---|
| `npm start` | Serveur de développement avec proxy `/api` → `localhost:8080` |
| `npm run build` | Build de production dans `dist/web/browser` |
| `npm test` | Tests unitaires (Vitest), 104 tests |
| `npm run lint` | ESLint (règles Angular et accessibilité) + Stylelint (SCSS) |
| `npm run api` | Régénère le client API depuis `../backend/api/openapi-3.0.yaml` |

## Conventions (vérifiées par ESLint)

- **Chaque composant est découpé en 4 fichiers** : `.component.ts`, `.component.html`, `.component.scss`, `.component.spec.ts`. Templates et styles intégrés au `.ts` sont interdits (`component-max-inline-declarations`). `ng generate component` respecte cette règle (voir `angular.json`).
- Composants autonomes, détection de changements `OnPush`, application **sans zone.js**, état local avec les **signals**, formulaires réactifs typés.
- Nouvelle syntaxe de templates (`@if`, `@for`, `@let`).
- Textes en français. Montants avec le pipe `money` (« 7 500 F CFA »). Dates à l'heure du Bénin (UTC+1), configurées globalement.
- Styles : variables de design dans `src/styles/_tokens.scss` et composants CSS communs (`.btn`, `.card`, `.field`, `.table`, `.badge`…) dans `_components.scss`. Les fichiers `.scss` des composants ne contiennent que la mise en page propre au composant.

## Organisation

```
src/
├── app/
│   ├── api/            Client généré (ne pas modifier : npm run api)
│   ├── core/           Session (AuthStore), gardes, intercepteurs HTTP, notifications, dialogues, mises en page
│   ├── shared/         Plan de sièges, QR code, compte à rebours, badges, états, pipes, dates
│   └── features/
│       ├── public/     Accueil, recherche, réservation, paiement, confirmation, agences, connexion
│       ├── account/    Espace client
│       └── admin/      Back-office (tableau de bord, guichet, départs, flotte, fidélité, personnel…)
├── styles/             Design system SCSS
└── testing/            Utilitaires de test
```

## Système de design

Une seule source de vérité : `src/styles/_tokens.scss`.

| Élément | Règle |
|---|---|
| Rayons | 3 seulement : 8 px (badges), 12 px (boutons, champs), 18 px (cartes), plus 24 px pour les grands panneaux |
| Hauteurs | Boutons et champs alignés : 36 px (`--sm`), 44 px (par défaut), 52 px (`--lg`) |
| Champs | Texte en 16 px (pas de zoom automatique sur iPhone), listes déroulantes et dates stylées à l'identique sur tous les navigateurs, champs à préfixe (`.input-group`) |
| Couleurs | Vert profond (marque), ambre (accent, à utiliser avec parcimonie), neutres légèrement chauds |
| Motif | Le billet de voyage : bord perforé (`.ticket-cut`), ligne de trajet avec arrêts, heures en chiffres alignés |
| Mise en page | En-têtes éditoriaux (titre à gauche, introduction à droite), variantes de présentation pour éviter les grilles répétitives : `cards`, `list`, `timeline`, `bento`, `inline` |
| États vides | Icône, titre, phrase utile et action (`bv-state`) |

## Connexion

- `/connexion` (voyageur) : numéro avec préfixe +229 et mise en forme automatique, code à 6 cases (`bv-otp-input` : passage automatique, collage, remplissage par SMS), renvoi possible après 60 s, puis nom demandé uniquement à la création du compte.
- `/admin/connexion` (personnel) : affichage du mot de passe, alerte majuscules verrouillées, rappel du verrouillage après 5 échecs.
- Les deux écrans partagent la même structure (`bv-auth-shell`) : panneau de marque à gauche, formulaire à droite.

## Appels à l'API

Le client est généré depuis l'OpenAPI du backend. Un appel = une fonction :

```ts
private readonly api = inject(Api);
const results = await this.api.invoke(searchDepartures, { from: 'cotonou', to: 'parakou', date: '2026-10-12' });
```

Les erreurs se convertissent en message français avec `apiErrorMessage(err)`.

## Sécurité

- Session en **cookies HttpOnly** posés par l'API (en-tête `X-Client-Type: web` ajouté automatiquement). Aucun jeton n'est accessible au JavaScript ni stocké dans le navigateur.
- **CSRF** : l'intercepteur recopie le cookie `XSRF-TOKEN` dans l'en-tête `X-XSRF-TOKEN` de chaque requête modifiante.
- **401** : renouvellement automatique de la session (une seule fois, partagé entre requêtes simultanées), puis nouvelle tentative. En cas d'échec, retour à l'écran de connexion.
- Les gardes de routes masquent les écrans ; **les droits réels sont contrôlés par l'API**.
- L'API et le site doivent être servis **sur le même domaine** (proxy en développement, Caddy en production, voir `../deploy/Caddyfile`). Variable backend correspondante : `COOKIE_PATH_PREFIX=/api`.

## Environnements

| Fichier | Utilisé par | `apiOrigin` |
|---|---|---|
| `src/environments/environment.development.ts` | `npm start` | `http://localhost:8080` |
| `src/environments/environment.ts` | `npm run build` (production) | `https://api.ayovoyage.sylvaintaio.com` |

- Le navigateur appelle toujours l'API sous `apiUrl` (`/api`, même domaine que le site). Ainsi les cookies de session restent internes au site et le jeton XSRF reste lisible.
- L'hébergeur redirige `/api/*` vers `apiOrigin`. `scripts/apply-env.mjs` (lancé avant `npm start` et `npm run build`) recopie ces adresses dans `proxy.conf.json` (développement) et `vercel.json` (production). Pour changer d'API, modifier **uniquement** les fichiers d'environnement.
- Dans le code, ne jamais écrire `/api` en dur : utiliser `API_URL` / `apiUrl()` (`core/http/api-url.ts`) ou le pipe `apiUrl` dans les gabarits.
- Côté API (production) : `CORS_ORIGINS` = adresse du site, `COOKIE_PATH_PREFIX=/api`, `COOKIE_DOMAIN` vide.

## Production

```bash
npm run build
# Vercel : déploiement automatique (vercel.json).
# Serveur propre : copier dist/web/browser vers /srv/web (servi par Caddy, voir ../deploy/Caddyfile)
```

Premier chargement : environ 94 Ko compressés. Les espaces client et back-office sont chargés à la demande.
