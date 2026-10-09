import { HttpErrorResponse } from '@angular/common/http';

interface ProblemDetails {
  status?: number;
  detail?: string;
  errors?: { location?: string; message?: string }[];
}

/** Message lisible (en français) extrait d'une erreur de l'API (RFC 9457). */
export function apiErrorMessage(err: unknown, fallback = 'Une erreur est survenue, veuillez réessayer.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Connexion impossible. Vérifiez votre réseau.';
    }
    const body = err.error as ProblemDetails | null;
    if (body?.status === 422 && body.errors?.length) {
      return body.errors.map((e) => fieldLabel(e.location) + (e.message ?? '')).join(' · ');
    }
    if (body?.detail) {
      return body.detail;
    }
  }
  return fallback;
}

/** Code HTTP d'une erreur, ou 0. */
export function apiErrorStatus(err: unknown): number {
  return err instanceof HttpErrorResponse ? err.status : 0;
}

function fieldLabel(location?: string): string {
  if (!location) {
    return '';
  }
  const field = location.replace(/^body\./, '');
  return field ? `${field} : ` : '';
}
