import { Dialog } from '@angular/cdk/dialog';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { MfaStepUpDialogComponent } from '../auth/mfa-step-up/mfa-step-up-dialog.component';
import { API_URL } from './api-url';

export const XSRF_COOKIE = 'XSRF-TOKEN';
export const XSRF_HEADER = 'X-XSRF-TOKEN';

/** Lit un cookie non HttpOnly (ex. XSRF-TOKEN). */
export function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
}

/** Indique au backend une session web : jetons en cookies HttpOnly, jamais dans le corps. */
export const clientTypeInterceptor: HttpInterceptorFn = (req, next) =>
  next(
    req.headers.has('X-Client-Type') ? req : req.clone({ setHeaders: { 'X-Client-Type': 'web' } }),
  );

/**
 * Protection CSRF (double-submit) : recopie le cookie XSRF-TOKEN dans l'en-tête
 * pour toute requête modifiante vers l'API. Placé en dernier pour relire le cookie
 * à chaque tentative (il change à chaque rafraîchissement de session).
 */
export const xsrfInterceptor: HttpInterceptorFn = (req, next) => {
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const sameOrigin = req.url.startsWith(API_URL + '/');
  const token = unsafe && sameOrigin ? readCookie(XSRF_COOKIE) : null;
  return next(token ? req.clone({ setHeaders: { [XSRF_HEADER]: token } }) : req);
};

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Sur une réponse 401, tente une seule fois de renouveler la session (rotation du
 * jeton), puis rejoue la requête. En cas d'échec, la session locale est effacée.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const auth = inject(AuthStore);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/v1/auth/');
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isAuthCall) {
        return throwError(() => err);
      }
      refreshInFlight ??= refresh(http).finally(() => (refreshInFlight = null));
      return from(refreshInFlight).pipe(
        switchMap((ok): Observable<never> | ReturnType<typeof next> => {
          if (ok) {
            return next(req);
          }
          auth.clear();
          const url = router.url;
          if (url.startsWith('/admin') && !url.startsWith('/admin/connexion')) {
            void router.navigate(['/admin/connexion'], { queryParams: { retour: url } });
          } else if (url.startsWith('/compte')) {
            void router.navigate(['/connexion'], { queryParams: { retour: url } });
          }
          return throwError(() => err);
        }),
      );
    }),
  );
};

async function refresh(http: HttpClient): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) =>
      http
        .post(`${API_URL}/v1/auth/refresh`, {})
        .subscribe({ next: () => resolve(), error: reject }),
    );
    return true;
  } catch {
    return false;
  }
}

let stepUpInFlight: Promise<boolean> | null = null;

/**
 * Action sensible (403 + en-tête X-MFA-Required) : demande le code de double
 * authentification, puis rejoue la requête une seule fois. Placé avant
 * xsrfInterceptor pour que la requête rejouée reprenne le nouveau cookie XSRF.
 */
export const mfaStepUpInterceptor: HttpInterceptorFn = (req, next) => {
  const dialog = inject(Dialog);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (
        !(err instanceof HttpErrorResponse) ||
        err.status !== 403 ||
        err.headers.get('X-MFA-Required') !== 'step-up'
      ) {
        return throwError(() => err);
      }
      stepUpInFlight ??= new Promise<boolean>((resolve) => {
        const ref = dialog.open<boolean>(MfaStepUpDialogComponent, {
          autoFocus: 'first-tabbable',
          disableClose: true,
        });
        ref.closed.subscribe((ok) => resolve(ok === true));
      }).finally(() => (stepUpInFlight = null));
      return from(stepUpInFlight).pipe(switchMap((ok) => (ok ? next(req) : throwError(() => err))));
    }),
  );
};
