/**
 * Environnement de DÉVELOPPEMENT (`npm start`) : remplace environment.ts
 * (voir `fileReplacements` dans angular.json).
 *
 * `apiOrigin` est la cible du proxy de `ng serve` (proxy.conf.json, régénéré
 * par `scripts/apply-env.mjs`) : l'API Go lancée par `make run`.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
  apiOrigin: 'http://localhost:8080',
};
