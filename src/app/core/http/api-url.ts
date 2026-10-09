import { environment } from '../../../environments/environment';

/** Préfixe des appels à l'API (voir src/environments). */
export const API_URL = environment.apiUrl;

/** Adresse d'une ressource de l'API pour un lien direct (PDF, export CSV, pièce jointe) : « /v1/… » → « /api/v1/… ». */
export function apiUrl(path: string): string {
  return API_URL + path;
}
