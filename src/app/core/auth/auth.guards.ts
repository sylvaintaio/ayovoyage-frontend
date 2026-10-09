import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore, StaffRole } from './auth.store';

/** Espace client : connexion par SMS requise. */
export const customerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  return auth.isCustomer()
    ? true
    : inject(Router).createUrlTree(['/connexion'], { queryParams: { retour: state.url } });
};

/**
 * Back-office : personnel connecté, avec éventuellement des rôles précis
 * (`data: { roles: [...] }` sur la route). Les droits réels sont contrôlés par l'API ;
 * ce garde ne fait que masquer les écrans inaccessibles.
 */
export const staffGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isStaff()) {
    return router.createUrlTree(['/admin/connexion'], { queryParams: { retour: state.url } });
  }
  const roles = (route.data['roles'] as StaffRole[] | undefined) ?? [];
  return roles.length === 0 || auth.hasRole(...roles) ? true : router.createUrlTree(['/admin']);
};
