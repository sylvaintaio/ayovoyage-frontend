/**
 * Environnement de PRODUCTION (`npm run build`).
 *
 * Le navigateur appelle toujours l'API sous `apiUrl` (même origine que le site) :
 * les cookies de session restent « first-party » et le jeton XSRF reste lisible.
 * L'hébergeur redirige ce préfixe vers `apiOrigin` : la règle de vercel.json est
 * régénérée à partir de ce fichier par `scripts/apply-env.mjs` (avant chaque build).
 */
export const environment = {
  production: true,
  /** Préfixe des appels à l'API depuis le navigateur. */
  apiUrl: '/api',
  /** Adresse réelle de l'API, cible de la redirection de `apiUrl`. */
  apiOrigin: 'https://api.ayovoyage.sylvaintaio.com',
};
